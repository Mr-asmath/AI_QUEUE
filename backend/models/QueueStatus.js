const mongoose = require('mongoose');

const queueStatusSchema = new mongoose.Schema({
  current_token: {
    type: Number,
    default: 0
  },
  current_token_details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  waiting_count: {
    type: Number,
    default: 0
  },
  avg_service_time: {
    type: Number,
    default: 5,
    min: 1,
    max: 60
  },
  total_served_today: {
    type: Number,
    default: 0
  },
  total_served_all_time: {
    type: Number,
    default: 0
  },
  peak_hours: [{
    hour: Number,
    count: Number,
    date: Date
  }],
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one document exists
queueStatusSchema.statics.getStatus = async function() {
  let status = await this.findOne();
  if (!status) {
    status = await this.create({});
  }
  return status;
};

// Method to update peak hours
queueStatusSchema.methods.updatePeakHours = function() {
  const currentHour = new Date().getHours();
  const today = new Date().setHours(0, 0, 0, 0);
  
  let peakHour = this.peak_hours.find(
    p => p.hour === currentHour && p.date.setHours(0,0,0,0) === today
  );
  
  if (peakHour) {
    peakHour.count += 1;
  } else {
    this.peak_hours.push({
      hour: currentHour,
      count: 1,
      date: new Date()
    });
  }
  
  // Keep only last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  this.peak_hours = this.peak_hours.filter(p => p.date >= weekAgo);
};

module.exports = mongoose.model('QueueStatus', queueStatusSchema);