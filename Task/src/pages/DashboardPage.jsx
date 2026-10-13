import { useEffect, useState } from 'react'
import { ArrowRight, Check, CheckSquare2, LoaderCircle, LogOut, Plus, RefreshCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import * as taskApi from '../api/taskApi.js'
import { normalizeApiError } from '../api/client.js'

function DashboardPage({ scope }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const organizationScope = scope === 'organization'
  const [tasks, setTasks] = useState([])
  const [organizationName, setOrganizationName] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [logoutError, setLogoutError] = useState('')

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const tasksRequest = taskApi.listTasks(scope)
      const organizationRequest = organizationScope ? taskApi.getOrganization() : Promise.resolve(null)
      const [taskResponse, organizationResponse] = await Promise.all([tasksRequest, organizationRequest])
      setTasks(taskResponse.data.data.tasks)
      if (organizationResponse) setOrganizationName(organizationResponse.data.data.name)
    } catch (requestError) {
      setError(normalizeApiError(requestError).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [scope])

  async function createTask(event) {
    event.preventDefault()
    if (title.trim().length < 3) {
      setError('Task title must be at least 3 characters.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const response = await taskApi.createTask({ title: title.trim(), is_org_task: organizationScope })
      setTasks((current) => [response.data.data, ...current])
      setTitle('')
    } catch (requestError) {
      setError(normalizeApiError(requestError).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleTask(task) {
    try {
      const response = await taskApi.updateTask(task._id, {
        status: task.status === 'DONE' ? 'TO_DO' : 'DONE',
      })
      setTasks((current) => current.map((item) => item._id === task._id ? response.data.data : item))
    } catch (requestError) {
      setError(normalizeApiError(requestError).message)
    }
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setLogoutError(normalizeApiError(requestError).message)
    }
  }

  const doneCount = tasks.filter((task) => task.status === 'DONE').length
  const displayName = user.full_name || user.username

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-slate-950">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><CheckSquare2 size={19} aria-hidden="true" /></span>
            <span>Task <span className="text-indigo-600">Management</span></span>
          </Link>
          <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
            <LogOut size={16} aria-hidden="true" /> Log out
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-indigo-600">{organizationScope ? organizationName || 'Organization workspace' : 'Personal workspace'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome, {displayName}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {organizationScope ? `Organization ${user.org_role?.toLowerCase() || 'member'}` : 'Your tasks, organized in one place.'}
            </p>
          </div>
          {organizationScope ? <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">{user.org_role || 'Member'}</span> : null}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Tasks</h2>
                <p className="mt-1 text-sm text-slate-500">{tasks.length} total · {doneCount} completed</p>
              </div>
              <button type="button" onClick={loadDashboard} aria-label="Refresh tasks" className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-700">
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={createTask} className="mt-6 flex gap-2">
              <label htmlFor="new-task-title" className="sr-only">New task title</label>
              <input id="new-task-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Add a task to your list" className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              <button type="submit" disabled={submitting} className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {submitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
                <span className="hidden sm:inline">Add task</span>
              </button>
            </form>

            {error ? <div role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {logoutError ? <div role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{logoutError}</div> : null}
            {loading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} aria-hidden="true" />Loading your tasks...</div>
            ) : tasks.length ? (
              <ul className="mt-5 divide-y divide-slate-100">
                {tasks.map((task) => {
                  const complete = task.status === 'DONE'
                  return (
                    <li key={task._id} className="flex items-center gap-3 py-4">
                      <button type="button" onClick={() => toggleTask(task)} aria-label={`${complete ? 'Reopen' : 'Mark'} task ${task.title} ${complete ? '' : 'complete'}`.trim()} className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-indigo-500'}`}>
                        <Check size={14} aria-hidden="true" />
                      </button>
                      <span className={`min-w-0 flex-1 text-sm ${complete ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</span>
                      <span className="text-xs text-slate-400">{task.priority?.toLowerCase() || 'medium'}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="py-14 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><CheckSquare2 size={22} aria-hidden="true" /></span>
                <h3 className="mt-4 text-sm font-semibold text-slate-800">A fresh start</h3>
                <p className="mt-1 text-sm text-slate-500">Add your first task above to get moving.</p>
              </div>
            )}
          </section>

          <aside className="h-fit rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white shadow-lg shadow-indigo-900/10">
            <p className="text-sm font-medium text-indigo-100">A steady pace</p>
            <p className="mt-3 text-4xl font-semibold">{doneCount}<span className="ml-2 text-lg font-medium text-indigo-100">/{tasks.length}</span></p>
            <p className="mt-1 text-sm text-indigo-100">tasks completed</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} /></div>
            <p className="mt-5 border-t border-white/15 pt-4 text-sm leading-6 text-indigo-50">Small steps add up. Choose one task and make a little progress today.</p>
            {organizationScope ? <p className="mt-5 flex items-center justify-between text-xs text-indigo-100">Workspace settings <ArrowRight size={14} aria-hidden="true" /></p> : null}
          </aside>
        </div>
      </section>
    </main>
  )
}

export default DashboardPage
