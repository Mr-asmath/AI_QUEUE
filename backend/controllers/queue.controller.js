const Token = require('../models/Token');
const QueueStatus = require('../models/QueueStatus');
const AIService = require('../services/ai.service');
const QueueService = require('../services/queue.service');

// @desc    Get queue status
// @route   GET /api/queue/status
// @access  Public
exports.getStatus = async (req, res, next) => {
  try {
    let status = await QueueStatus.getStatus();
    
    if (!status) {
      status = await QueueService.updateQueueStatus();
    }

    // Get upcoming tokens with AI optimization
    const optimizedQueue = await QueueService.getOptimizedQueue(5);

    // Get today's stats
    const todayStats = await QueueService.getDailyStats();

    res.json({
      success: true,
      data: {
        current_token: status.current_token,
        current_token_details: status.current_token_details,
        waiting_count: status.waiting_count,
        total_served_today: status.total_served_today,
        total_served_all_time: status.total_served_all_time,
        avg_service_time: status.avg_service_time,
        upcoming_tokens: optimizedQueue,
        today_stats: todayStats,
        last_updated: status.last_updated
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Estimate wait time for a token
// @route   GET /api/queue/estimate/:token_number
// @access  Public
exports.estimateWait = async (req, res, next) => {
  try {
    const { token_number } = req.params;
    
    const token = await Token.findOne({ token_number });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    if (token.status !== 'waiting') {
      return res.json({
        success: true,
        data: {
          token_number,
          status: token.status,
          message: `Token is ${token.status}`,
          estimated_wait_time: 0
        }
      });
    }

    // Count higher priority tokens ahead
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

    const status = await QueueStatus.getStatus();
    
    // Get AI prediction
    const estimatedWait = await AIService.predictWaitTime(position, status.avg_service_time);

    // Calculate completion time
    const completionTime = new Date(Date.now() + estimatedWait * 60000);

    res.json({
      success: true,
      data: {
        token_number,
        position_ahead: position,
        estimated_wait_time: estimatedWait,
        estimated_completion: completionTime,
        current_time: new Date(),
        avg_service_time: status.avg_service_time
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get queue statistics
// @route   GET /api/queue/stats
// @access  Public
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Token.getQueueStats();
    const status = await QueueStatus.getStatus();
    
    res.json({
      success: true,
      data: {
        ...stats,
        avg_service_time: status.avg_service_time,
        peak_hours: status.peak_hours.slice(-24) // Last 24 hours
      }
    });
  } catch (error) {
    next(error);
  }
};