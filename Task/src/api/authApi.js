import { apiClient } from './client.js';

export const register = (payload) => apiClient.post('/auth/register', payload);
export const login = (payload) => apiClient.post('/auth/login', payload);
export const logout = () => apiClient.post('/auth/logout');
export const me = () => apiClient.get('/auth/me');
export const checkAvailability = (payload) => apiClient.post('/auth/availability', payload);
export const forgotPassword = (payload) => apiClient.post('/auth/forgot-password', payload);
export const resetPassword = (payload) => apiClient.post('/auth/reset-password', payload);