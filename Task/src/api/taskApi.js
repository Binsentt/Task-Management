import { apiClient } from './client.js'

export const listTasks = (scope) => apiClient.get('/tasks', { params: { scope, limit: 100 } })
export const createTask = (payload) => apiClient.post('/tasks', payload)
export const updateTask = (id, payload) => apiClient.patch(`/tasks/${id}`, payload)
export const getOrganization = () => apiClient.get('/organizations/me')
