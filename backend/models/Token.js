const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token_number: {
    type: Number,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  user_name: {
    type: String,
    default: 'Guest',
    required: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age cannot be negative'],
    max: [150, 'Please enter a valid age']
  },
  emergency: {
    type: Boolean,
    default: false
  },
  token_type: {
    type: String,
    enum: ['regular', 'vip'],
    default: 'regular'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 200
  },
  status: {
    type: String,
    enum: ['waiting', 'called', 'completed', 'cancelled'],
    default: 'waiting',
    index: true
  },
  estimated_wait_time: {
    type: Number,
    default: 0
  },
  estimated_completion_time: {
    type: Date
  },
  called_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
tokenSchema.index({ status: 1, priority: -1, created_at: 1 });
tokenSchema.index({ user_id: 1, status: 1 });

// Virtual for waiting time
tokenSchema.virtual('waiting_time').get(function() {
  if (this.called_at) {
    return (this.called_at - this.created_at) / 60000; // in minutes
  }
  return null;
});

// Virtual for service time
tokenSchema.virtual('service_time').get(function() {
  if (this.completed_at && this.called_at) {
    return (this.completed_at - this.called_at) / 60000; // in minutes
  }
  return null;
});

// Static method to get next token
tokenSchema.statics.getNextToken = function() {
  return this.findOne({ status: 'waiting' })
    .sort({ priority: -1, created_at: 1 });
};

// Static method to get queue statistics
tokenSchema.statics.getQueueStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});
};

module.exports = mongoose.model('Token', tokenSchema);