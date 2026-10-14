import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client.js', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from './client.js'
import { deleteTask, listTasks } from './taskApi.js'

describe('task API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists tasks with the requested page and limit', () => {
    listTasks('personal', 2, 100)

    expect(apiClient.get).toHaveBeenCalledWith('/tasks', {
      params: { scope: 'personal', page: 2, limit: 100 },
    })
  })

  it('lists organization tasks with default paging', () => {
    listTasks('organization')

    expect(apiClient.get).toHaveBeenCalledWith('/tasks', {
      params: { scope: 'organization', page: 1, limit: 100 },
    })
  })

  it('deletes a task by id', () => {
    deleteTask('task-id')

    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/task-id')
  })
})
