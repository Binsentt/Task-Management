import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { normalizeApiError } from '../api/client.js'
import { deadlineToLocalFields, localDateKey } from '../dashboard/taskDates.js'

const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000

function getDeadline(task) {
  if (!task.deadline) return null

  const deadline = new Date(task.deadline)
  return Number.isNaN(deadline.getTime()) ? null : deadline
}

function getPriorityGroup(task, deadline, nowTimestamp, upcomingCutoff, today) {
  if (deadline && deadline.getTime() < nowTimestamp) return 0
  if (deadline && localDateKey(deadline) === today) return 1
  if (deadline && deadline.getTime() <= upcomingCutoff) return 2
  if (!deadline && task.priority === 'HIGH') return 3
  return -1
}

function getPriorities(tasks, now) {
  const nowTimestamp = now.getTime()
  const upcomingCutoff = nowTimestamp + sevenDaysInMilliseconds
  const today = localDateKey(now)

  return tasks
    .filter((task) => task.status !== 'DONE')
    .map((task, index) => ({
      task,
      deadline: getDeadline(task),
      index,
    }))
    .map((entry) => ({
      ...entry,
      group: getPriorityGroup(entry.task, entry.deadline, nowTimestamp, upcomingCutoff, today),
    }))
    .filter(({ group }) => group !== -1)
    .sort((left, right) =>
      left.group - right.group ||
      (left.deadline?.getTime() ?? Number.POSITIVE_INFINITY) -
        (right.deadline?.getTime() ?? Number.POSITIVE_INFINITY) ||
      left.index - right.index,
    )
}

function formatDeadline(deadline) {
  const { date, time } = deadlineToLocalFields(deadline)
  if (!date || !time) return ''

  const [year, month, day] = date.split('-').map(Number)
  const localDate = new Date(year, month - 1, day, 12)
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(localDate)
  return `${formattedDate} · ${time}`
}

function formatStatus(status) {
  if (status === 'DONE') return 'Completed'
  if (status === 'IN_PROGRESS') return 'In progress'
  return 'To do'
}

function SummaryCard({ title, count, Icon, warning = false }) {
  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-sm shadow-slate-900/[0.02] ${warning && count > 0 ? 'border-rose-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-600">{title}</h2>
        <span className={`flex size-10 items-center justify-center rounded-xl ${warning && count > 0 ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight ${warning && count > 0 ? 'text-rose-700' : 'text-slate-950'}`}>
        {count}
      </p>
    </article>
  )
}

function PriorityTaskItem({ entry, now, onEdit, onToggleStatus, onDelete }) {
  const { task, deadline } = entry
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isOverdue = Boolean(deadline && deadline.getTime() < now.getTime())
  const dueToday = Boolean(deadline && localDateKey(deadline) === localDateKey(now))
  const dueLabel = deadline ? formatDeadline(deadline) : ''

  async function toggleStatus() {
    setBusy(true)
    setError('')
    try {
      await onToggleStatus(task)
    } catch (requestError) {
      setError(normalizeApiError(requestError).message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteTask() {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await onDelete(task)
    } catch (requestError) {
      setError(normalizeApiError(requestError).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-xl border border-slate-100 px-3.5 py-4 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isOverdue ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Overdue
              </span>
            ) : dueToday ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Due today
              </span>
            ) : deadline ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Upcoming
              </span>
            ) : (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                High priority
              </span>
            )}
            <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900">
              {task.title}
            </h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-medium ${task.priority === 'HIGH' ? 'bg-rose-50 text-rose-700' : task.priority === 'LOW' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>
              {String(task.priority ?? 'MEDIUM').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())} priority
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              {formatStatus(task.status)}
            </span>
            {dueLabel ? (
              <time dateTime={deadline.toISOString()} className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                <CalendarClock size={14} aria-hidden="true" />
                {dueLabel}
              </time>
            ) : null}
          </div>
          {error ? <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={busy}
            aria-label={`Mark ${task.title} complete`}
            className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Complete
          </button>
          <button
            type="button"
            onClick={deleteTask}
            disabled={busy}
            aria-label={`Delete ${task.title}`}
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
}

function DashboardOverviewPage() {
  const {
    tasks = [],
    loading,
    error,
    refreshTasks,
    openNewTask,
    openTask,
    updateTask,
    deleteTask,
    scope,
  } = useOutletContext()
  const now = new Date()
  const overdueCount = tasks.filter((task) => {
    const deadline = getDeadline(task)
    return task.status !== 'DONE' && deadline && deadline.getTime() < now.getTime()
  }).length
  const hasTasksDueToday = tasks.some((task) => {
    const deadline = getDeadline(task)
    return task.status !== 'DONE' && deadline && localDateKey(deadline) === localDateKey(now)
  })
  const priorities = getPriorities(tasks, now)
  const showTaskContent = tasks.length > 0 || (!loading && !error)

  async function toggleTaskStatus(task) {
    const confirmed = await updateTask(task._id, {
      status: task.status === 'DONE' ? 'TO_DO' : 'DONE',
    })
    if (!confirmed) throw new Error('The task could not be updated.')
  }

  async function removeTask(task) {
    await deleteTask(task._id)
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">A clear view of what needs your attention.</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Your work at a glance</h2>
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

      <section aria-label="Task summary" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total tasks" count={tasks.length} Icon={ListTodo} />
        <SummaryCard
          title="Completed"
          count={tasks.filter((task) => task.status === 'DONE').length}
          Icon={CheckCircle2}
        />
        <SummaryCard
          title="In Progress"
          count={tasks.filter((task) => task.status === 'IN_PROGRESS').length}
          Icon={Activity}
        />
        <SummaryCard title="Overdue" count={overdueCount} Icon={AlertTriangle} warning />
      </section>

      {loading && tasks.length === 0 ? (
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
      {loading && tasks.length > 0 ? (
        <p role="status" className="mt-4 text-xs text-slate-500">Refreshing tasks…</p>
      ) : null}
      {error && tasks.length > 0 ? (
        <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <button
            type="button"
            onClick={refreshTasks}
            className="min-h-9 self-start rounded-lg border border-rose-300 bg-white px-3 font-semibold text-rose-800 transition hover:bg-rose-100 sm:self-auto"
          >
            Retry
          </button>
        </div>
      ) : null}

      {showTaskContent ? (
        <section
          aria-labelledby="todays-priorities-heading"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="todays-priorities-heading" className="text-lg font-semibold tracking-tight text-slate-950">
                Today&apos;s priorities
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Overdue, due today, upcoming this week, and high-priority tasks without a deadline.
              </p>
            </div>
            {tasks.length > 0 && priorities.length > 0 && !hasTasksDueToday ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 sm:mt-0">
                <Clock3 size={15} aria-hidden="true" />
                No tasks due today
              </p>
            ) : null}
          </div>
          {tasks.length === 0 ? (
            <div className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center">
              <h3 className="text-sm font-semibold text-slate-800">No {scope === 'organization' ? 'organization' : 'personal'} tasks yet</h3>
              <p className="mt-1 text-sm text-slate-500">Create your first task to see it here.</p>
              <p className="mt-1 text-xs text-slate-400">No tasks due today.</p>
              <button
                type="button"
                onClick={openNewTask}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} aria-hidden="true" />
                Create your first task
              </button>
            </div>
          ) : priorities.length ? (
            <ul aria-label="Today's priority tasks" className="mt-5 space-y-2.5">
              {priorities.map((entry) => (
                <PriorityTaskItem
                  key={entry.task._id}
                  entry={entry}
                  now={now}
                  onEdit={openTask}
                  onToggleStatus={toggleTaskStatus}
                  onDelete={removeTask}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No tasks due today or needing attention. Check My Tasks for the rest of your list.
            </p>
          )}
        </section>
      ) : null}
    </main>
  )
}

export default DashboardOverviewPage
