import { apiClient } from './client.js';

export const register = (payload) => apiClient.post('/auth/register', payload);
export const login = (payload) => apiClient.post('/auth/login', payload);
export const logout = () => apiClient.post('/auth/logout');
export const me = () => apiClient.get('/auth/me');