import { useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { CalendarClock, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { normalizeApiError } from '../api/client.js'
import { deadlineToLocalFields } from '../dashboard/taskDates.js'

function deadlineLabel(value) {
  if (!value) return ''
  const { date, time } = deadlineToLocalFields(value)
  if (!date || !time) return ''

  const [year, month, day] = date.split('-').map(Number)
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12))
  return `${formattedDate} · ${time}`
}

function DashboardTasksPage() {
  const location = useLocation()
  const query = new URLSearchParams(location.search).get('q')?.trim() ?? ''
  const { tasks = [], loading, error, refreshTasks, openNewTask, openTask, updateTask, deleteTask, scope } = useOutletContext()
  const [busyIds, setBusyIds] = useState(() => new Set())
  const [taskError, setTaskError] = useState('')
  const normalizedQuery = query.toLocaleLowerCase()
  const visibleTasks = tasks.filter((task) =>
    `${task.title ?? ''} ${task.content ?? ''}`.toLocaleLowerCase().includes(normalizedQuery),
  )

  async function changeTask(task, action) {
    if (busyIds.has(task._id)) return
    if (action === 'delete' && !window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    setBusyIds((current) => new Set(current).add(task._id))
    setTaskError('')
    try {
      if (action === 'delete') await deleteTask(task._id)
      else await updateTask(task._id, { status: task.status === 'DONE' ? 'TO_DO' : 'DONE' })
    } catch (requestError) {
      setTaskError(normalizeApiError(requestError).message)
    } finally {
      setBusyIds((current) => { const next = new Set(current); next.delete(task._id); return next })
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            {query ? `Showing results for “${query}”.` : `Track and manage your ${scope === 'organization' ? 'organization' : 'personal'} task list.`}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Your tasks</h2>
        </div>
        <button
          type="button"
          onClick={openNewTask}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 sm:self-auto"
        >
          <Plus size={17} aria-hidden="true" />
          New Task
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Loading tasks
        </p>
      ) : null}
      {!loading && error ? (
        <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={refreshTasks}
            className="min-h-10 self-start rounded-lg border border-rose-300 bg-white px-3.5 font-semibold text-rose-800 transition hover:bg-rose-100 sm:self-auto"
          >
            Retry
          </button>
        </div>
      ) : null}
      {taskError ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{taskError}</p> : null}
      {!loading && !error ? (
        visibleTasks.length ? (
          <ul aria-label={scope === 'organization' ? 'Organization tasks' : 'Personal tasks'} className="mt-6 space-y-3">
            {visibleTasks.map((task) => {
              const due = deadlineLabel(task.deadline)
              return (
                <li
                  key={task._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm font-semibold ${task.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {String(task.status ?? 'TO_DO').replaceAll('_', ' ')}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                          {String(task.priority ?? 'MEDIUM').toLowerCase()}
                        </span>
                      </div>
                      {task.content ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{task.content}</p> : null}
                      {due ? (
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <CalendarClock size={15} aria-hidden="true" />
                          <time dateTime={task.deadline}>{due}</time>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => changeTask(task, 'toggle')} disabled={busyIds.has(task._id)} aria-label={`${task.status === 'DONE' ? 'Reopen' : 'Mark'} ${task.title} ${task.status === 'DONE' ? '' : 'complete'}`.trim()} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-50"><Check size={15} /> {task.status === 'DONE' ? 'Reopen' : 'Complete'}</button>
                    <button
                      type="button"
                      onClick={() => openTask(task)}
                      aria-label={`Edit ${task.title}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Edit
                    </button>
                    <button type="button" onClick={() => changeTask(task, 'delete')} disabled={busyIds.has(task._id)} aria-label={`Delete ${task.title}`} className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-rose-700 disabled:opacity-50"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm shadow-slate-900/[0.02]">
            <h3 className="text-sm font-semibold text-slate-800">
              {query ? 'No matching tasks' : 'No tasks yet'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {query ? 'Try another search or clear your query.' : 'Create a task to get started.'}
            </p>
          </div>
        )
      ) : null}
    </main>
  )
}

export default DashboardTasksPage
