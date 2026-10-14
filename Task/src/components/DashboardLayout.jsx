import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  CheckSquare2,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { normalizeApiError } from '../api/client.js'
import { usePersonalTasks } from '../hooks/usePersonalTasks.js'
import PersonalTaskDialog from './PersonalTaskDialog.jsx'

const dashboardLinks = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/tasks', label: 'My Tasks', Icon: ListTodo },
  { to: '/dashboard/calendar', label: 'Calendar', Icon: CalendarDays },
]

function userInitials(user) {
  const name = user?.full_name?.trim() || user?.username?.trim() || ''
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length > 1) return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
  return (words[0] || '').slice(0, 2).toUpperCase()
}

function DashboardNavigation({ ariaLabel, onNavigate }) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-col gap-1">
      {dashboardLinks.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`
          }
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { tasks, loading, error, refreshTasks, createTask, updateTask, deleteTask } =
    usePersonalTasks(user?._id)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const mobileDrawerRef = useRef(null)
  const menuButtonRef = useRef(null)
  const wasMobileOpenRef = useRef(false)

  const pageTitle = location.pathname === '/dashboard/tasks'
    ? 'My Tasks'
    : location.pathname === '/dashboard/calendar'
      ? 'Calendar'
      : 'Overview'
  const displayName = user?.full_name || user?.username || 'User'
  const initials = userInitials(user)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!mobileOpen) {
      if (wasMobileOpenRef.current) {
        wasMobileOpenRef.current = false
        menuButtonRef.current?.focus()
      }
      return undefined
    }

    wasMobileOpenRef.current = true
    const drawer = mobileDrawerRef.current
    const focusableElements = () =>
      [...(drawer?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || [])].filter((element) => !element.hasAttribute('inert'))

    focusableElements()[0]?.focus()

    function handleDrawerKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = focusableElements()
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) {
        event.preventDefault()
        return
      }
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleDrawerKeyDown)
    return () => window.removeEventListener('keydown', handleDrawerKeyDown)
  }, [mobileOpen])

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(normalizeApiError(error).message)
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    navigate(`/dashboard/tasks?q=${encodeURIComponent(searchQuery.trim())}`)
  }

  function openNewTask() {
    setSelectedTask(null)
    setTaskDialogOpen(true)
  }

  function openTask(task) {
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }

  async function saveTask(payload, taskId) {
    if (taskId) return updateTask(taskId, payload)
    return createTask(payload)
  }

  function closeTaskDialog() {
    setTaskDialogOpen(false)
    setSelectedTask(null)
  }

  const outletContext = {
    tasks,
    loading,
    error,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    openNewTask,
    openTask,
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside
        inert={taskDialogOpen}
        className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6 md:flex"
      >
        <Brand />
        <p className="mt-9 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Personal workspace
        </p>
        <div className="mt-3">
          <DashboardNavigation ariaLabel="Dashboard navigation" />
        </div>
        <div className="mt-auto border-t border-slate-100 pt-5">
          <UserSummary displayName={displayName} initials={initials} />
          <LogoutButton onClick={handleLogout} />
        </div>
      </aside>

      <div
        aria-hidden={!mobileOpen}
        className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <button
          type="button"
          aria-label="Close navigation backdrop"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          id="mobile-dashboard-drawer"
          ref={mobileDrawerRef}
          inert={!mobileOpen || taskDialogOpen}
          className={`relative flex h-full w-[min(20rem,85vw)] flex-col bg-white px-5 py-6 shadow-2xl transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <Brand />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-9 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Personal workspace
          </p>
          <div className="mt-3">
            <DashboardNavigation
              ariaLabel="Mobile dashboard navigation"
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
          <div className="mt-auto border-t border-slate-100 pt-5">
            <UserSummary displayName={displayName} initials={initials} />
            <LogoutButton onClick={handleLogout} />
          </div>
        </aside>
      </div>

      <div className="min-w-0 flex-1" inert={mobileOpen || taskDialogOpen}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[76px] flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0 lg:px-8">
            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-controls="mobile-dashboard-drawer"
              aria-expanded={mobileOpen}
              ref={menuButtonRef}
              onClick={() => setMobileOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 md:hidden"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950">{pageTitle}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Personal workspace</p>
            </div>
            <form
              onSubmit={submitSearch}
              role="search"
              className="relative order-3 w-full max-w-none sm:order-none sm:max-w-sm sm:flex-1"
            >
              <label className="sr-only" htmlFor="dashboard-task-search">Search tasks</label>
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="dashboard-task-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </form>
            <div
              aria-label={`Signed in as ${displayName}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
            >
              {initials}
            </div>
          </div>
        </header>
        {logoutError ? (
          <div role="alert" className="mx-4 mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-6 lg:mx-8">
            {logoutError}
          </div>
        ) : null}
        <Outlet context={outletContext} />
      </div>
      {taskDialogOpen ? (
        <PersonalTaskDialog
          task={selectedTask}
          onClose={closeTaskDialog}
          onSave={saveTask}
        />
      ) : null}
    </div>
  )
}

function Brand() {
  return (
    <div className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-slate-950">
      <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
        <CheckSquare2 size={19} aria-hidden="true" />
      </span>
      <span>Task Management</span>
    </div>
  )
}

function UserSummary({ displayName, initials }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-3 px-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
        {initials}
      </span>
      <span className="truncate text-sm font-medium text-slate-700">{displayName}</span>
    </div>
  )
}

function LogoutButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
    >
      <LogOut size={18} aria-hidden="true" />
      Log out
    </button>
  )
}

export default DashboardLayout
