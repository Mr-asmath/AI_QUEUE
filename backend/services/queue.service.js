const Token = require('../models/Token');
const QueueStatus = require('../models/QueueStatus');
const QueueHistory = require('../models/QueueHistory');
const AIService = require('./ai.service');

class QueueService {
  async updateQueueStatus() {
    try {
      const [waitingCount, currentToken, servedToday, totalServed] = await Promise.all([
        Token.countDocuments({ status: 'waiting' }),
        Token.findOne({ status: 'called' }),
        Token.countDocuments({
          status: 'completed',
          completed_at: { $gte: new Date().setHours(0, 0, 0, 0) }
        }),
        Token.countDocuments({ status: 'completed' })
      ]);

      let status = await QueueStatus.getStatus();
      
      status.current_token = currentToken?.token_number || 0;
      status.current_token_details = currentToken || {};
      status.waiting_count = waitingCount;
      status.total_served_today = servedToday;
      status.total_served_all_time = totalServed;
      status.last_updated = new Date();

      // Update peak hours
      status.updatePeakHours();

      await status.save();
      
      return status;
    } catch (error) {
      console.error('❌ Error updating queue status:', error);
      throw error;
    }
  }

  async moveToHistory(token) {
    try {
      const waitingTime = token.called_at 
        ? (token.called_at - token.created_at) / 60000 
        : 0;
      
      const serviceTime = token.completed_at && token.called_at
        ? (token.completed_at - token.called_at) / 60000
        : 0;

      await QueueHistory.create({
        token_number: token.token_number,
        user_id: token.user_id,
        user_name: token.user_name,
        age: token.age,
        emergency: token.emergency,
        token_type: token.token_type,
        priority: token.priority,
        status: token.status,
        waiting_time: Math.round(waitingTime * 100) / 100,
        service_time: Math.round(serviceTime * 100) / 100,
        created_at: token.created_at,
        called_at: token.called_at,
        completed_at: token.completed_at || new Date()
      });

      console.log(`✅ Token #${token.token_number} moved to history`);
    } catch (error) {
      console.error('❌ Error moving to history:', error);
      throw error;
    }
  }

  async getOptimizedQueue(limit = 10) {
    try {
      const waitingTokens = await Token.find({ status: 'waiting' })
        .sort({ priority: -1, created_at: 1 })
        .limit(limit);
      
      // Use AI for advanced optimization
      const optimized = await AIService.optimizeQueue(waitingTokens);
      
      return optimized;
    } catch (error) {
      console.error('❌ Error optimizing queue:', error);
      return Token.find({ status: 'waiting' })
        .sort({ priority: -1, created_at: 1 })
        .limit(limit);
    }
  }

  async getDailyStats(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await QueueHistory.aggregate([
      {
        $match: {
          date: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgWaitTime: { $avg: '$waiting_time' },
          avgServiceTime: { $avg: '$service_time' },
          emergency: {
            $sum: { $cond: ['$emergency', 1, 0] }
          },
          vip: {
            $sum: { $cond: [{ $eq: ['$token_type', 'vip'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      avgWaitTime: 0,
      avgServiceTime: 0,
      emergency: 0,
      vip: 0
    };
  }
}

module.exports = new QueueService();