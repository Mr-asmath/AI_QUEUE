const Token = require('../models/Token');
const User = require('../models/User');
const QueueStatus = require('../models/QueueStatus');
const AIService = require('../services/ai.service');
const QueueService = require('../services/queue.service');

// @desc    Generate new token
// @route   POST /api/token
// @access  Private
exports.generateToken = async (req, res, next) => {
  try {
    const { age, emergency, token_type = 'regular' } = req.body;
    const userId = req.user.id;

    // Validate age
    if (!age || age < 0 || age > 150) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid age'
      });
    }

    // Get user
    const user = await User.findById(userId);

    // Get waiting count
    const waiting = await Token.countDocuments({ status: 'waiting' });
    
    // Get queue status for avg service time
    const status = await QueueStatus.getStatus();

    // Calculate priority using AI
    const priority = await AIService.getPriority(age, emergency, waiting, token_type);

    // Predict wait time using AI
    const estimatedWait = await AIService.predictWaitTime(waiting, status.avg_service_time);

    // Get last token number
    const lastToken = await Token.findOne().sort({ token_number: -1 });
    const token_number = lastToken ? lastToken.token_number + 1 : 1;

    // Predict completion time
    const completionTime = await AIService.predictCompletionTime(
      new Date().toISOString(),
      waiting,
      status.avg_service_time
    );

    // Create token
    const token = await Token.create({
      token_number,
      user_id: userId,
      user_name: user.name,
      age,
      emergency,
      token_type,
      priority,
      estimated_wait_time: estimatedWait,
      estimated_completion_time: completionTime
    });

    // Update queue status
    await QueueService.updateQueueStatus();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('token_generated', {
      token_number,
      estimated_wait: estimatedWait,
      waiting_count: waiting + 1
    });

    res.status(201).json({
      success: true,
      data: {
        token_number,
        estimated_wait_time: estimatedWait,
        estimated_completion_time: completionTime,
        position: waiting + 1,
        priority: token.priority
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's tokens
// @route   GET /api/tokens/my
// @access  Private
exports.getUserTokens = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const tokens = await Token.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Token.countDocuments({ user_id: req.user.id });

    res.json({
      success: true,
      count: tokens.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: tokens
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get token details
// @route   GET /api/token/:number
// @access  Public
exports.getTokenDetails = async (req, res, next) => {
  try {
    const token = await Token.findOne({ token_number: req.params.number });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    // Get position in queue (number of higher priority tokens ahead)
    const higherPriority = await Token.countDocuments({
      status: 'waiting',
      priority: { $gt: token.priority }
    });

    const samePriorityAhead = await Token.countDocuments({
      status: 'waiting',
      priority: token.priority,
      created_at: { $lt: token.created_at }
    });

    const position = higherPriority + samePriorityAhead;

    // Get estimated wait time
    const status = await QueueStatus.getStatus();
    const estimatedWait = await AIService.predictWaitTime(position, status.avg_service_time);

    // Get current token
    const currentToken = await Token.findOne({ status: 'called' });

    res.json({
      success: true,
      data: {
        ...token.toJSON(),
        position_ahead: position,
        current_estimated_wait: estimatedWait,
        current_token: currentToken?.token_number || 0,
        total_waiting: await Token.countDocuments({ status: 'waiting' })
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel token
// @route   PUT /api/token/:number/cancel
// @access  Private
exports.cancelToken = async (req, res, next) => {
  try {
    const token = await Token.findOne({ 
      token_number: req.params.number,
      user_id: req.user.id
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    if (token.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel token that is ${token.status}`
      });
    }

    token.status = 'cancelled';
    token.completed_at = new Date();
    await token.save();

    // Move to history
    await QueueService.moveToHistory(token);

    // Update queue status
    await QueueService.updateQueueStatus();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('token_cancelled', { 
      token_number: token.token_number,
      waiting_count: await Token.countDocuments({ status: 'waiting' })
    });

    res.json({
      success: true,
      message: 'Token cancelled successfully',
      data: token
    });
  } catch (error) {
    next(error);
  }
};