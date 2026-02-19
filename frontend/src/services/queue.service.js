import api from './api';

class QueueService {
  async getQueueStatus() {
    const response = await api.get('/queue/status');
    return response.data;
  }

  async getQueueStats() {
    const response = await api.get('/queue/stats');
    return response.data;
  }

  // Admin endpoints
  async callNextToken() {
    const response = await api.put('/admin/queue/next');
    return response.data;
  }

  async resetQueue() {
    const response = await api.post('/admin/queue/reset');
    return response.data;
  }

  async getQueueHistory(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/admin/queue/history?${params}`);
    return response.data;
  }

  async getAnalytics(days = 7) {
    const response = await api.get(`/admin/analytics?days=${days}`);
    return response.data;
  }

  async updateSettings(settings) {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  }

  // User management (admin)
  async getUsers(page = 1, limit = 20, search = '') {
    const response = await api.get(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
    return response.data;
  }

  async toggleUserStatus(userId) {
    const response = await api.put(`/admin/users/${userId}/toggle`);
    return response.data;
  }
}

export default new QueueService();