const mongoose = require('mongoose');

const queueHistorySchema = new mongoose.Schema({
  token_number: {
    type: Number,
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  user_name: String,
  age: Number,
  emergency: Boolean,
  token_type: String,
  priority: Number,
  status: String,
  waiting_time: Number, // in minutes
  service_time: Number, // in minutes
  created_at: Date,
  called_at: Date,
  completed_at: Date,
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for analytics
queueHistorySchema.index({ date: -1, token_type: 1 });
queueHistorySchema.index({ user_id: 1, date: -1 });

// Static method for analytics
queueHistorySchema.statics.getAnalytics = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          token_type: '$token_type',
          status: '$status'
        },
        count: { $sum: 1 },
        avgWaitTime: { $avg: '$waiting_time' },
        avgServiceTime: { $avg: '$service_time' },
        maxWaitTime: { $max: '$waiting_time' }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
};

module.exports = mongoose.model('QueueHistory', queueHistorySchema);