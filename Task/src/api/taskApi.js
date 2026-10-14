import { apiClient } from './client.js'

export const listTasks = (scope, page = 1, limit = 100) => apiClient.get('/tasks', { params: { scope, page, limit } })
export const createTask = (payload) => apiClient.post('/tasks', payload)
export const updateTask = (id, payload) => apiClient.patch(`/tasks/${id}`, payload)
export const deleteTask = (id) => apiClient.delete(`/tasks/${id}`)
export const getOrganization = () => apiClient.get('/organizations/me')
