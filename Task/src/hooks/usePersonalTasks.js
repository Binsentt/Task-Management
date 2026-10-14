import { useCallback, useEffect, useRef, useState } from 'react'
import * as taskApi from '../api/taskApi.js'
import { normalizeApiError } from '../api/client.js'

export function usePersonalTasks(userId) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadRequestRef = useRef(0)
  const identityRef = useRef(0)
  const mutationChangesRef = useRef([])

  const refreshTasks = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    const identityId = identityRef.current
    const isCurrentRequest = () =>
      requestId === loadRequestRef.current && identityId === identityRef.current

    setLoading(true)
    setError('')

    try {
      const firstResponse = await taskApi.listTasks('personal', 1, 100)
      if (!isCurrentRequest()) return

      const { tasks: firstPageTasks, pages = 1 } = firstResponse.data.data
      const allTasks = [...firstPageTasks]

      for (let page = 2; page <= pages; page += 1) {
        const response = await taskApi.listTasks('personal', page, 100)
        if (!isCurrentRequest()) return
        allTasks.push(...response.data.data.tasks)
      }

      const reconciledTasks = mutationChangesRef.current.reduce((currentTasks, change) => {
        if (change.type === 'delete') {
          return currentTasks.filter((task) => task._id !== change.taskId)
        }

        const existingIndex = currentTasks.findIndex((task) => task._id === change.task._id)
        if (existingIndex === -1) return [change.task, ...currentTasks]

        return currentTasks.map((task) =>
          task._id === change.task._id ? change.task : task,
        )
      }, allTasks)
      mutationChangesRef.current = []
      setTasks(reconciledTasks)
    } catch (requestError) {
      if (isCurrentRequest()) setError(normalizeApiError(requestError).message)
    } finally {
      if (isCurrentRequest()) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    identityRef.current += 1
    mutationChangesRef.current = []
    setTasks([])
    setLoading(true)
    setError('')
    refreshTasks()

    return () => {
      identityRef.current += 1
      loadRequestRef.current += 1
    }
  }, [refreshTasks])

  const commitMutation = useCallback((identityId, updateTasks, change) => {
    if (identityId !== identityRef.current) return

    loadRequestRef.current += 1
    mutationChangesRef.current.push(change)
    setTasks(updateTasks)
    refreshTasks()
  }, [refreshTasks])

  const createTask = useCallback(async (payload) => {
    const identityId = identityRef.current
    const response = await taskApi.createTask(payload)
    const confirmedTask = response.data.data

    commitMutation(
      identityId,
      (currentTasks) => [
        confirmedTask,
        ...currentTasks.filter((task) => task._id !== confirmedTask._id),
      ],
      { type: 'upsert', task: confirmedTask },
    )

    return confirmedTask
  }, [commitMutation])

  const updateTask = useCallback(async (taskId, payload) => {
    const identityId = identityRef.current
    const response = await taskApi.updateTask(taskId, payload)
    const confirmedTask = response.data.data

    commitMutation(
      identityId,
      (currentTasks) => {
        const existingIndex = currentTasks.findIndex((task) => task._id === taskId)
        if (existingIndex === -1) return [...currentTasks, confirmedTask]
        return currentTasks.map((task) => task._id === taskId ? confirmedTask : task)
      },
      { type: 'upsert', task: confirmedTask },
    )

    return confirmedTask
  }, [commitMutation])

  const deleteTask = useCallback(async (taskId) => {
    const identityId = identityRef.current
    const response = await taskApi.deleteTask(taskId)

    commitMutation(
      identityId,
      (currentTasks) => currentTasks.filter((task) => task._id !== taskId),
      { type: 'delete', taskId },
    )

    return response
  }, [commitMutation])

  return { tasks, loading, error, refreshTasks, createTask, updateTask, deleteTask }
}
