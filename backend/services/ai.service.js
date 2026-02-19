const axios = require('axios');

class AIService {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.timeout = 5000; // 5 seconds timeout
  }

  async getPriority(age, emergency, waiting_time, token_type = 'regular') {
    try {
      const response = await axios.post(`${this.baseURL}/priority`, {
        age,
        emergency,
        waiting_time,
        token_type
      }, { 
        timeout: this.timeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.data.priority_score;
    } catch (error) {
      console.error('❌ AI Service Error (getPriority):', error.message);
      // Fallback priority calculation
      return this.calculatePriorityFallback(age, emergency, waiting_time, token_type);
    }
  }

  async predictWaitTime(patients_before, avg_service_time = 5) {
    try {
      const response = await axios.post(`${this.baseURL}/predict-wait`, {
        patients_before,
        avg_service_time,
        use_current_time: true
      }, { timeout: this.timeout });
      
      return Math.round(response.data.estimated_wait * 10) / 10;
    } catch (error) {
      console.error('❌ AI Service Error (predictWaitTime):', error.message);
      return Math.round(patients_before * avg_service_time * 10) / 10;
    }
  }

  async predictCompletionTime(token_time, position, avg_service_time) {
    try {
      const response = await axios.post(`${this.baseURL}/predict-completion`, {
        token_time,
        position,
        avg_service_time
      }, { timeout: this.timeout });
      
      return response.data.completion_time;
    } catch (error) {
      console.error('❌ AI Service Error (predictCompletionTime):', error.message);
      const completionTime = new Date(Date.now() + position * avg_service_time * 60000);
      return completionTime.toISOString();
    }
  }

  async optimizeQueue(tokens) {
    try {
      const response = await axios.post(`${this.baseURL}/optimize`, {
        tokens: tokens.map(t => ({
          token_number: t.token_number,
          priority: t.priority,
          age: t.age,
          emergency: t.emergency,
          waiting_time: (Date.now() - new Date(t.created_at)) / 60000
        }))
      }, { timeout: this.timeout });
      
      return response.data.queue;
    } catch (error) {
      console.error('❌ AI Service Error (optimizeQueue):', error.message);
      return tokens.sort((a, b) => b.priority - a.priority);
    }
  }

  calculatePriorityFallback(age, emergency, waiting_time, token_type) {
    let score = 0;
    
    // Emergency gets highest priority
    if (emergency) score += 100;
    
    // Age-based priority
    if (age >= 65) score += 30;
    else if (age >= 50) score += 15;
    else if (age <= 10) score += 25;
    
    // Waiting time factor (increases over time)
    score += Math.min(waiting_time * 2, 50);
    
    // VIP bonus
    if (token_type === 'vip') score += 40;
    
    return Math.min(Math.round(score), 200);
  }
}

module.exports = new AIService();