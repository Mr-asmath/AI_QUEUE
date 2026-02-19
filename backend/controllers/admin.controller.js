const Token = require('../models/Token');
const QueueStatus = require('../models/QueueStatus');
const QueueHistory = require('../models/QueueHistory');
const User = require('../models/User');
const QueueService = require('../services/queue.service');

// @desc    Call next token
// @route   PUT /api/admin/queue/next
// @access  Private/Admin
exports.callNext = async (req, res, next) => {
  try {
    // Complete current token
    const current = await Token.findOne({ status: 'called' });
    
    if (current) {
      current.status = 'completed';
      current.completed_at = new Date();
      await current.save();
      await QueueService.moveToHistory(current);
    }

    // Get next token based on priority
    const next = await Token.getNextToken();

    if (!next) {
      await QueueService.updateQueueStatus();
      
      // Emit socket event
      const io = req.app.get('io');
      io.emit('queue_empty');
      
      return res.json({
        success: true,
        message: 'No tokens waiting',
        data: null
      });
    }

    next.status = 'called';
    next.called_at = new Date();
    await next.save();

    // Update queue status
    const status = await QueueService.updateQueueStatus();

    // Calculate and update average service time
    if (current && current.called_at) {
      const serviceTime = (next.called_at - current.called_at) / 60000;
      // Weighted average (70% new, 30% historical)
      status.avg_service_time = (serviceTime * 0.7 + status.avg_service_time * 0.3);
      await status.save();
    }

    // Get optimized queue for display
    const optimizedQueue = await QueueService.getOptimizedQueue(5);

    // Emit socket event
    const io = req.app.get('io');
    io.emit('token_called', {
      token_number: next.token_number,
      waiting_count: status.waiting_count,
      optimized_queue: optimizedQueue
    });

    res.json({
      success: true,
      data: {
        token: next,
        waiting_count: status.waiting_count,
        optimized_queue: optimizedQueue
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset queue
// @route   POST /api/admin/queue/reset
// @access  Private/Admin
exports.resetQueue = async (req, res, next) => {
  try {
    // Move all active tokens to history
    const activeTokens = await Token.find({ 
      status: { $in: ['waiting', 'called'] } 
    });

    for (const token of activeTokens) {
      token.status = 'cancelled';
      token.completed_at = new Date();
      await token.save();
      await QueueService.moveToHistory(token);
    }

    // Reset queue status
    await QueueStatus.deleteMany({});
    await QueueService.updateQueueStatus();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('queue_reset');

    res.json({
      success: true,
      message: 'Queue reset successfully',
      data: {
        tokens_affected: activeTokens.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get queue history
// @route   GET /api/admin/queue/history
// @access  Private/Admin
exports.getQueueHistory = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      status,
      token_type,
      user_id
    } = req.query;
    
    let query = {};
    
    // Date filter
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Token type filter
    if (token_type) {
      query.token_type = token_type;
    }

    // User filter
    if (user_id) {
      query.user_id = user_id;
    }

    const history = await QueueHistory.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user_id', 'name email');

    const total = await QueueHistory.countDocuments(query);

    // Get summary statistics
    const summary = await QueueHistory.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgWaitTime: { $avg: '$waiting_time' },
          avgServiceTime: { $avg: '$service_time' },
          emergency: { $sum: { $cond: ['$emergency', 1, 0] } },
          vip: { $sum: { $cond: [{ $eq: ['$token_type', 'vip'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        history,
        summary: summary[0] || {},
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    const [
      dailyStats,
      tokenTypeStats,
      hourlyStats,
      userStats,
      status
    ] = await Promise.all([
      // Daily statistics
      QueueHistory.getAnalytics(parseInt(days)),
      
      // Token type distribution
      QueueHistory.aggregate([
        {
          $group: {
            _id: '$token_type',
            count: { $sum: 1 },
            avgWaitTime: { $avg: '$waiting_time' }
          }
        }
      ]),
      
      // Hourly distribution
      QueueHistory.aggregate([
        {
          $group: {
            _id: { $hour: '$created_at' },
            count: { $sum: 1 },
            avgWaitTime: { $avg: '$waiting_time' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Top users
      QueueHistory.aggregate([
        {
          $group: {
            _id: '$user_id',
            count: { $sum: 1 },
            avgWaitTime: { $avg: '$waiting_time' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        }
      ]),
      
      // Current queue status
      QueueStatus.getStatus()
    ]);

    // Get user details for top users
    const topUsers = await Promise.all(
      userStats.map(async (stat) => {
        const user = await User.findById(stat._id);
        return {
          ...stat,
          user_name: user?.name || 'Unknown',
          user_email: user?.email || 'Unknown'
        };
      })
    );

    res.json({
      success: true,
      data: {
        daily: dailyStats,
        token_types: tokenTypeStats,
        hourly: hourlyStats,
        top_users: topUsers,
        current_status: {
          waiting: status.waiting_count,
          served_today: status.total_served_today,
          avg_service_time: status.avg_service_time,
          peak_hours: status.peak_hours.slice(-24)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update queue settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    const { avg_service_time } = req.body;
    
    if (avg_service_time && (avg_service_time < 1 || avg_service_time > 60)) {
      return res.status(400).json({
        success: false,
        error: 'Average service time must be between 1 and 60 minutes'
      });
    }
    
    const status = await QueueStatus.getStatus();
    
    if (avg_service_time) {
      status.avg_service_time = avg_service_time;
    }
    
    await status.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user status
// @route   PUT /api/admin/users/:userId/toggle
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate admin users'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};