import { useState } from 'react'
import {
  Bell, CalendarDays, Check, CircleCheck, Clock3, LayoutGrid,
  Menu, Plus, Search, Sparkles, TrendingUp, X,
} from 'lucide-react'

const tones = {
  indigo: 'bg-indigo-500',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
}
const statusStyles = {
  'In progress': 'bg-indigo-50 text-indigo-700',
  'To do': 'bg-slate-100 text-slate-600',
  Completed: 'bg-emerald-50 text-emerald-700',
}
const actionClass = 'rounded-xl transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 disabled:cursor-default disabled:hover:bg-transparent'

function SummaryCard({ label, value, detail, icon: Icon, color, detailColor = 'text-slate-500' }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon aria-hidden="true" size={19} className={color} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className={`mt-2 text-xs ${detailColor}`}>{detail}</p>
    </div>
  )
}

/** Presentational dashboard. Callbacks belong to the authentication/API owners. */
export default function DashboardPage({
  user,
  tasks = [],
  projects = [],
  summary = {},
  now = new Date(),
  onNewTask,
  onNavigate,
  onNotifications,
  onProfile,
  onTaskSelect,
}) {
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = user?.name?.trim() || 'there'
  const firstName = displayName.split(/\s+/)[0]
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase() || 'U'
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const completed = summary.completed ?? tasks.filter((task) => task.status === 'Completed').length
  const total = summary.total ?? tasks.length
  const pending = summary.pending ?? tasks.filter((task) => task.status !== 'Completed').length
  const query = search.trim().toLowerCase()
  const filteredTasks = tasks.filter((task) => `${task.title} ${task.project ?? ''} ${task.status ?? ''}`.toLowerCase().includes(query))

  function navigate(destination) {
    setMenuOpen(false)
    onNavigate?.(destination)
  }

  const navigation = (
    <>
      <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Menu</p>
      <nav aria-label="Workspace navigation" className="space-y-1.5">
        <button type="button" aria-current="page" onClick={() => setMenuOpen(false)} className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-indigo-50 px-3.5 text-left text-sm font-medium text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
          <LayoutGrid aria-hidden="true" size={18} /> Overview
        </button>
        <button type="button" onClick={() => navigate('tasks')} disabled={!onNavigate} className={`flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-sm text-slate-500 ${actionClass}`}>
          <CircleCheck aria-hidden="true" size={18} /> My tasks
          <span className="ml-auto rounded-md bg-white px-2 py-1 text-xs text-slate-500">{pending}</span>
        </button>
        <button type="button" onClick={() => navigate('calendar')} disabled={!onNavigate} className={`flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-sm text-slate-500 ${actionClass}`}>
          <CalendarDays aria-hidden="true" size={18} /> Calendar
        </button>
      </nav>
      {projects.length > 0 && (
        <div className="mt-7 space-y-1 border-t border-slate-200 pt-5">
          {projects.map((project) => (
            <button type="button" key={project.id} onClick={() => navigate(`project:${project.id}`)} disabled={!onNavigate} className={`flex min-h-10 w-full items-center gap-3 px-3.5 text-left text-xs text-slate-500 ${actionClass}`}>
              <span className={`size-2.5 shrink-0 rounded-full ${tones[project.color] ?? tones.indigo}`} />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="sticky top-0 z-20 flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label={menuOpen ? 'Close workspace menu' : 'Open workspace menu'} aria-expanded={menuOpen} aria-controls="mobile-workspace-menu" onClick={() => setMenuOpen(!menuOpen)} className={`p-2 text-slate-500 md:hidden ${actionClass}`}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><Check aria-hidden="true" size={21} strokeWidth={2.5} /></span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">Task Management</span>
          <span className="ml-3 hidden h-5 w-px bg-slate-200 lg:block" />
          <span className="hidden text-sm text-slate-400 lg:block">Workspace</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:block"><SearchField search={search} setSearch={setSearch} /></div>
          <button type="button" aria-label="Notifications" onClick={onNotifications} disabled={!onNotifications} className={`p-2.5 text-slate-500 ${actionClass}`}><Bell aria-hidden="true" size={21} /></button>
          <button type="button" aria-label={`Profile for ${displayName}`} onClick={onProfile} disabled={!onProfile} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{initials}</button>
        </div>
        <div className="w-full sm:hidden"><SearchField search={search} setSearch={setSearch} /></div>
      </header>

      <div className="flex min-h-[calc(100dvh-72px)]">
        <aside className="hidden w-[224px] shrink-0 border-r border-slate-100 bg-slate-50/70 p-4 pt-7 md:block lg:w-[248px] lg:p-5 lg:pt-7">{navigation}</aside>
        {menuOpen && (
          <aside id="mobile-workspace-menu" aria-label="Mobile workspace menu" className="fixed bottom-0 left-0 top-[124px] z-10 w-[248px] overflow-y-auto border-r border-slate-200 bg-slate-50 p-5 shadow-xl sm:top-[72px] md:hidden">{navigation}</aside>
        )}

        <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1120px]">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs font-medium text-slate-400 sm:text-sm">{dateLabel}</p>
                <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{greeting}, {firstName}</h1>
              </div>
              <button type="button" onClick={onNewTask} disabled={!onNewTask} title={!onNewTask ? 'Task creation will be connected soon' : undefined} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition enabled:hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 disabled:cursor-default">
                <Plus aria-hidden="true" size={17} /> New task
              </button>
            </div>

            <section aria-label="Task summary" className="mt-7 grid gap-4 sm:grid-cols-3 lg:mt-8 lg:gap-5">
              <SummaryCard label="Total tasks" value={total} detail={`Across ${summary.projectCount ?? projects.length} projects`} icon={LayoutGrid} color="text-indigo-500" />
              <SummaryCard label="Completed" value={completed} detail={summary.completedThisWeek != null ? `+${summary.completedThisWeek} this week` : 'Keep making progress'} icon={CircleCheck} color="text-emerald-500" detailColor="text-emerald-600" />
              <SummaryCard label="On track" value={summary.onTrackPercent != null ? `${summary.onTrackPercent}%` : '—'} detail={summary.onTrackPercent != null ? 'Great momentum' : 'No deadline data yet'} icon={TrendingUp} color="text-blue-500" />
            </section>

            <section aria-labelledby="priorities-heading" className="mt-7 rounded-2xl border border-slate-200/70 bg-white px-5 py-6 shadow-sm shadow-slate-900/[0.02] sm:p-7 lg:mt-8">
              <h2 id="priorities-heading" className="text-base font-semibold">Today&apos;s priorities</h2>
              <p className="mt-1.5 text-xs text-slate-400">Keep your momentum going</p>
              {filteredTasks.length > 0 ? (
                <ul className="mt-5 divide-y divide-slate-100">
                  {filteredTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-3 py-5 sm:items-center sm:gap-4">
                      <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full sm:mt-0 ${tones[task.color] ?? tones.indigo}`} />
                      <div className="min-w-0 flex-1">
                        {onTaskSelect ? <button type="button" onClick={() => onTaskSelect(task)} className="text-left text-sm font-medium hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600">{task.title}</button> : <p className="break-words text-sm font-medium">{task.title}</p>}
                        <p className="mt-1.5 text-xs text-slate-400">{[task.project, task.dueLabel].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium sm:px-3 ${statusStyles[task.status] ?? statusStyles['To do']}`}>{task.status ?? 'To do'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div role="status" className="py-12 text-center">
                  <CircleCheck aria-hidden="true" className="mx-auto text-indigo-300" size={30} />
                  <p className="mt-3 text-sm font-medium">{query ? 'No tasks match your search' : 'No priorities yet'}</p>
                  <p className="mt-1 text-xs text-slate-500">{query ? 'Try a different task name or project.' : 'Your upcoming tasks will appear here.'}</p>
                </div>
              )}
            </section>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-indigo-50/80 px-4 py-4 sm:px-5">
              <Sparkles aria-hidden="true" size={18} className="shrink-0 text-indigo-500" />
              <p className="text-xs leading-5 text-indigo-600">You&apos;re building a great rhythm. Keep it up!</p>
              <Clock3 aria-hidden="true" size={17} className="ml-auto shrink-0 text-indigo-400" />
            </div>
            {summary.completedToday > 0 && (
              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Check aria-hidden="true" size={20} /></span>
                <div><p className="text-sm font-semibold">You&apos;re on track!</p><p className="mt-1 text-xs text-slate-500">{summary.completedToday} tasks completed today</p></div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function SearchField({ search, setSearch }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-slate-400 sm:w-[200px] lg:w-[240px]">
      <Search aria-hidden="true" size={16} className="shrink-0" />
      <input type="search" aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-400" />
    </label>
  )
}
