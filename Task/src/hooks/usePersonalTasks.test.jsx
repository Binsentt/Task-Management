import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/taskApi.js', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}))

import * as taskApi from '../api/taskApi.js'
import { usePersonalTasks } from './usePersonalTasks.js'

const task = (id, title = `Task ${id}`) => ({
  _id: id,
  title,
  status: 'TO_DO',
})

const listResponse = (tasks, pages = 1) => ({
  data: { data: { tasks, pages } },
})

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('usePersonalTasks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    taskApi.listTasks.mockResolvedValue(listResponse([task('first', 'First task')], 1))
  })

  it('loads every personal task page and combines the results', async () => {
    taskApi.listTasks
      .mockResolvedValueOnce(listResponse([task('first', 'First task')], 2))
      .mockResolvedValueOnce(listResponse([task('second', 'Second task')], 2))

    const { result } = renderHook(() => usePersonalTasks('user-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(taskApi.listTasks).toHaveBeenNthCalledWith(1, 'personal', 1, 100)
    expect(taskApi.listTasks).toHaveBeenNthCalledWith(2, 'personal', 2, 100)
    expect(result.current.tasks).toEqual([
      task('first', 'First task'),
      task('second', 'Second task'),
    ])
  })

  it('adds the confirmed created task only after the API resolves', async () => {
    const pendingCreate = deferred()
    const confirmedTask = { ...task('created'), title: 'Server title', status: 'DONE' }
    taskApi.createTask.mockReturnValue(pendingCreate.promise)

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let creation
    act(() => {
      creation = result.current.createTask({ title: 'Requested title' })
    })
    expect(result.current.tasks).toEqual([task('first', 'First task')])

    await act(async () => {
      pendingCreate.resolve({ data: { data: confirmedTask } })
      await creation
    })

    expect(taskApi.createTask).toHaveBeenCalledWith({ title: 'Requested title' })
    expect(result.current.tasks).toEqual([confirmedTask, task('first', 'First task')])
    await expect(creation).resolves.toBe(confirmedTask)
  })

  it('replaces a task with the confirmed updated task only after the API resolves', async () => {
    const pendingUpdate = deferred()
    const confirmedTask = { ...task('first'), title: 'Confirmed title', status: 'DONE' }
    taskApi.updateTask.mockReturnValue(pendingUpdate.promise)

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let update
    act(() => {
      update = result.current.updateTask('first', { title: 'Requested title' })
    })
    expect(result.current.tasks).toEqual([task('first', 'First task')])

    await act(async () => {
      pendingUpdate.resolve({ data: { data: confirmedTask } })
      await update
    })

    expect(taskApi.updateTask).toHaveBeenCalledWith('first', { title: 'Requested title' })
    expect(result.current.tasks).toEqual([confirmedTask])
    await expect(update).resolves.toBe(confirmedTask)
  })

  it('removes a task only after the API deletion succeeds', async () => {
    const pendingDelete = deferred()
    taskApi.deleteTask.mockReturnValue(pendingDelete.promise)

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let deletion
    act(() => {
      deletion = result.current.deleteTask('first')
    })
    expect(result.current.tasks).toEqual([task('first', 'First task')])

    await act(async () => {
      pendingDelete.resolve({ data: { data: { success: true } } })
      await deletion
    })

    expect(taskApi.deleteTask).toHaveBeenCalledWith('first')
    expect(result.current.tasks).toEqual([])
  })

  it('keeps a confirmed mutation when an older refresh resolves afterward', async () => {
    const staleRefresh = deferred()
    const confirmedTask = task('created', 'Confirmed task')
    taskApi.listTasks
      .mockResolvedValueOnce(listResponse([task('first', 'First task')]))
      .mockReturnValueOnce(staleRefresh.promise)
    taskApi.createTask.mockResolvedValue({ data: { data: confirmedTask } })

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let refresh
    act(() => {
      refresh = result.current.refreshTasks()
    })
    await waitFor(() => expect(taskApi.listTasks).toHaveBeenCalledTimes(2))

    await act(async () => {
      await result.current.createTask({ title: 'Requested task' })
    })
    expect(result.current.tasks).toEqual([confirmedTask, task('first', 'First task')])

    await act(async () => {
      staleRefresh.resolve(listResponse([task('stale', 'Stale task')]))
      await refresh
    })

    expect(result.current.tasks).toEqual([confirmedTask, task('first', 'First task')])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('reloads a complete task list when a mutation completes during the initial load', async () => {
    const initialLoad = deferred()
    const existingTask = task('existing', 'Existing task')
    const confirmedTask = task('created', 'Confirmed task')
    taskApi.listTasks
      .mockReturnValueOnce(initialLoad.promise)
      .mockResolvedValueOnce(listResponse([existingTask]))
    taskApi.createTask.mockResolvedValue({ data: { data: confirmedTask } })

    const { result } = renderHook(() => usePersonalTasks('user-1'))

    await act(async () => {
      await result.current.createTask({ title: 'Requested task' })
    })
    await waitFor(() => expect(taskApi.listTasks).toHaveBeenCalledTimes(2))
    await act(async () => {
      initialLoad.resolve(listResponse([task('stale', 'Stale task')]))
      await initialLoad.promise
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([confirmedTask, existingTask])
  })

  it('reloads all pages when a mutation completes during pagination', async () => {
    const pendingSecondPage = deferred()
    const firstPageTask = task('first-page', 'First page task')
    const secondPageTask = task('second-page', 'Second page task')
    const confirmedTask = task('created', 'Confirmed task')
    taskApi.listTasks
      .mockResolvedValueOnce(listResponse([firstPageTask], 2))
      .mockReturnValueOnce(pendingSecondPage.promise)
      .mockResolvedValueOnce(listResponse([firstPageTask], 2))
      .mockResolvedValueOnce(listResponse([secondPageTask], 2))
    taskApi.createTask.mockResolvedValue({ data: { data: confirmedTask } })

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(taskApi.listTasks).toHaveBeenCalledTimes(2))

    await act(async () => {
      await result.current.createTask({ title: 'Requested task' })
    })
    await waitFor(() => expect(taskApi.listTasks).toHaveBeenCalledTimes(4))

    await act(async () => {
      pendingSecondPage.resolve(listResponse([secondPageTask], 2))
      await pendingSecondPage.promise
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([confirmedTask, firstPageTask, secondPageTask])
  })

  it('ignores errors from a refresh invalidated by a successful mutation', async () => {
    const staleRefresh = deferred()
    taskApi.listTasks
      .mockResolvedValueOnce(listResponse([task('first', 'First task')]))
      .mockReturnValueOnce(staleRefresh.promise)
    taskApi.createTask.mockResolvedValue({ data: { data: task('created') } })

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let refresh
    act(() => {
      refresh = result.current.refreshTasks()
    })
    await waitFor(() => expect(taskApi.listTasks).toHaveBeenCalledTimes(2))

    await act(async () => {
      await result.current.createTask({ title: 'Requested task' })
    })

    await act(async () => {
      staleRefresh.reject(new Error('stale list failed'))
      await refresh
    })

    expect(result.current.error).toBe('')
    expect(result.current.loading).toBe(false)
  })

  it('exposes a list error and clears it after a successful refresh', async () => {
    taskApi.listTasks
      .mockRejectedValueOnce(new Error('list failed'))
      .mockResolvedValueOnce(listResponse([task('retried', 'Retried task')]))

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.error).toBe('list failed'))
    expect(result.current.loading).toBe(false)

    await act(async () => {
      await result.current.refreshTasks()
    })

    expect(result.current.error).toBe('')
    expect(result.current.tasks).toEqual([task('retried', 'Retried task')])
    expect(taskApi.listTasks).toHaveBeenCalledTimes(2)
  })

  it('rejects a failed mutation without changing the task collection', async () => {
    const mutationError = new Error('create failed')
    taskApi.createTask.mockRejectedValue(mutationError)

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const originalTasks = result.current.tasks

    await expect(
      act(async () => result.current.createTask({ title: 'New task' })),
    ).rejects.toBe(mutationError)
    expect(result.current.tasks).toBe(originalTasks)
  })

  it('rejects a failed update without changing the task collection', async () => {
    const mutationError = new Error('update failed')
    taskApi.updateTask.mockRejectedValue(mutationError)

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const originalTasks = result.current.tasks

    await expect(
      act(async () => result.current.updateTask('first', { title: 'Changed title' })),
    ).rejects.toBe(mutationError)
    expect(taskApi.updateTask).toHaveBeenCalledWith('first', { title: 'Changed title' })
    expect(result.current.tasks).toBe(originalTasks)
  })

  it('rejects a failed deletion without changing the task collection', async () => {
    const mutationError = new Error('delete failed')
    taskApi.deleteTask.mockRejectedValue(mutationError)

    const { result } = renderHook(() => usePersonalTasks('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const originalTasks = result.current.tasks

    await expect(
      act(async () => result.current.deleteTask('first')),
    ).rejects.toBe(mutationError)
    expect(taskApi.deleteTask).toHaveBeenCalledWith('first')
    expect(result.current.tasks).toBe(originalTasks)
  })

  it('does not let a previous user load replace the current user tasks', async () => {
    const previousUserLoad = deferred()
    const currentUserLoad = deferred()
    taskApi.listTasks
      .mockReturnValueOnce(previousUserLoad.promise)
      .mockReturnValueOnce(currentUserLoad.promise)

    const { result, rerender } = renderHook(
      ({ userId }) => usePersonalTasks(userId),
      { initialProps: { userId: 'previous-user' } },
    )
    rerender({ userId: 'current-user' })

    await act(async () => {
      currentUserLoad.resolve(listResponse([task('current', 'Current user task')]))
      await currentUserLoad.promise
    })
    await waitFor(() => expect(result.current.tasks).toEqual([task('current', 'Current user task')]))

    await act(async () => {
      previousUserLoad.resolve(listResponse([task('previous', 'Previous user task')]))
      await previousUserLoad.promise
    })

    expect(result.current.tasks).toEqual([task('current', 'Current user task')])
  })

  it('does not continue pagination when unmounted during the initial request', async () => {
    const pendingLoad = deferred()
    taskApi.listTasks.mockReturnValue(pendingLoad.promise)

    const { unmount } = renderHook(() => usePersonalTasks('user-1'))
    unmount()

    await act(async () => {
      pendingLoad.resolve(listResponse([task('first')], 2))
      await pendingLoad.promise
    })

    expect(taskApi.listTasks).toHaveBeenCalledTimes(1)
  })
})
