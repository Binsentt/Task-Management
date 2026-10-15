import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { deadlineToLocalFields, localDateKey } from '../dashboard/taskDates.js'

const monthLabel = (date) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)

function DashboardCalendarPage() {
  const { tasks = [], loading, error, refreshTasks, openTask, openNewTask } = useOutletContext()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(() => localDateKey(new Date()))
  const tasksByDay = useMemo(() => {
    const days = new Map()
    for (const task of tasks) {
      if (!task.deadline) continue
      const { date } = deadlineToLocalFields(task.deadline)
      if (!date) continue
      days.set(date, [...(days.get(date) || []), task])
    }
    for (const items of days.values()) items.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    return days
  }, [tasks])
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + numberOfDays }, (_, index) => index - firstWeekday + 1)
  const selectedTasks = tasksByDay.get(selected) || []

  function moveMonth(amount) {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1)
    setMonth(next)
    setSelected(localDateKey(next))
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Task deadlines in your workspace.</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Calendar</h2>
        </div>
        <button type="button" onClick={openNewTask} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={17} /> New Task</button>
      </div>
      {loading ? <p role="status" className="mt-5 text-sm text-slate-500">Loading tasks…</p> : null}
      {error ? <div role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" onClick={refreshTasks} className="font-semibold underline">Retry</button></div> : null}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Task calendar">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">{monthLabel(month)}</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(localDateKey(today)) }} className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium">Today</button>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="flex size-9 items-center justify-center rounded-lg border border-slate-200"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="flex size-9 items-center justify-center rounded-lg border border-slate-200"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((day, index) => {
            if (day < 1) return <span key={`empty-${index}`} />
            const key = localDateKey(new Date(month.getFullYear(), month.getMonth(), day))
            const count = tasksByDay.get(key)?.length || 0
            return <button key={key} type="button" onClick={() => setSelected(key)} aria-label={`${key}, ${count} ${count === 1 ? 'task' : 'tasks'}`} aria-pressed={selected === key} className={`min-h-16 rounded-xl border p-1 text-center text-sm transition sm:min-h-20 ${selected === key ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:bg-slate-50'}`}><span className="block font-semibold">{day}</span>{count ? <span className="mt-1 inline-block rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{count}</span> : null}</button>
          })}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Selected day tasks">
        <h3 className="font-semibold text-slate-950">{new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date(`${selected}T12:00:00`))}</h3>
        {selectedTasks.length ? <ul className="mt-4 space-y-2">{selectedTasks.map((task) => <li key={task._id}><button type="button" onClick={() => openTask(task)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300"><span className="font-medium text-slate-800">{task.title}</span><span className="text-xs text-slate-500">{deadlineToLocalFields(task.deadline).time} · {task.status.replaceAll('_', ' ')}</span></button></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No tasks due on this day.</p>}
      </section>
    </main>
  )
}

export default DashboardCalendarPage
