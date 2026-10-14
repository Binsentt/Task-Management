import { ArrowLeft, Check, CheckSquare2, Circle, Clock3, ListTodo } from 'lucide-react'
import AppLink from './AppLink.jsx'

function TaskArtwork() {
  return (
    <aside className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-700 p-6 text-white md:flex md:min-h-[540px] md:flex-col md:justify-between lg:min-h-[620px] lg:p-10">
      <div className="absolute -right-20 -top-20 size-72 rounded-full border border-white/10" />
      <div className="absolute -bottom-28 -left-24 size-80 rounded-full border border-white/10" />
      <div className="relative">
        <AppLink to="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
            <CheckSquare2 size={21} aria-hidden="true" />
          </span>
          Task Management
        </AppLink>
        <h2 className="mt-16 max-w-md text-4xl font-semibold leading-tight tracking-tight">
          A little more focus, every day.
        </h2>
        <p className="mt-4 max-w-sm text-base leading-7 text-indigo-100">
          Bring your priorities together and make steady progress on what matters.
        </p>
      </div>
      <div className="relative rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-indigo-950/20 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-indigo-700">
              <ListTodo size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Today’s priorities</p>
              <p className="mt-0.5 text-xs text-indigo-100">A clear plan, one step at a time</p>
            </div>
          </div>
          <Clock3 size={18} className="text-indigo-100" aria-hidden="true" />
        </div>
        <div className="mt-5 space-y-3">
          {[
            ['Review project goals', true],
            ['Plan the next milestone', false],
            ['Share a progress update', false],
          ].map(([label, complete]) => (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3">
              <span className="flex size-5 items-center justify-center rounded-full border border-white/50">
                {complete ? <Check size={13} aria-hidden="true" /> : <Circle size={8} aria-hidden="true" />}
              </span>
              <span className={`text-sm ${complete ? 'text-indigo-100 line-through' : 'text-white'}`}>{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-1/3 rounded-full bg-white" />
        </div>
        <p className="mt-2 text-right text-xs text-indigo-100">1 of 3 complete</p>
      </div>
    </aside>
  )
}

export default function AuthLayout({ children, backTo = '/', backLabel = 'Back to home' }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl items-center gap-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.78fr)] md:gap-5 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.95fr)] lg:gap-8">
        <section className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white px-5 py-7 shadow-xl shadow-slate-900/[0.04] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <AppLink to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-700">
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </AppLink>
          {children}
        </section>
        <TaskArtwork />
      </div>
    </main>
  )
}
