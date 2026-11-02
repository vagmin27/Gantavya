import { apiClient } from './api';

export const AuthService = {
  async register({ name, email, password }) {
    const response = await apiClient.post('/auth/register', { name, email, password });
    return response.data;
  },

  async login({ email, password }) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async updateMe(data) {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  }
};

