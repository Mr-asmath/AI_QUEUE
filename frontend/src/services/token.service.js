import api from './api';

class TokenService {
  async generateToken(tokenData) {
    const response = await api.post('/token', tokenData);
    return response.data;
  }

  async getUserTokens(page = 1, limit = 10) {
    const response = await api.get(`/tokens/my?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getTokenDetails(tokenNumber) {
    const response = await api.get(`/token/${tokenNumber}`);
    return response.data;
  }

  async cancelToken(tokenNumber) {
    const response = await api.put(`/token/${tokenNumber}/cancel`);
    return response.data;
  }

  async estimateWaitTime(tokenNumber) {
    const response = await api.get(`/queue/estimate/${tokenNumber}`);
    return response.data;
  }
}

export default new TokenService();