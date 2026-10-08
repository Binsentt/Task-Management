import {
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  Clock3,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

const tasks = [
  {
    title: 'Review project proposal',
    detail: 'Product launch · Today',
    color: 'bg-indigo-500',
    tag: 'In progress',
    tagColor: 'bg-indigo-50 text-indigo-700',
  },
  {
    title: 'Prepare design handoff',
    detail: 'Website refresh · Today',
    color: 'bg-blue-500',
    tag: 'In progress',
    tagColor: 'bg-blue-50 text-blue-700',
  },
  {
    title: 'Send weekly team update',
    detail: 'Team operations · Tomorrow',
    color: 'bg-emerald-500',
    tag: 'To do',
    tagColor: 'bg-slate-100 text-slate-600',
  },
]

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[660px] pb-6 pl-2 sm:pl-6 lg:ml-auto lg:mr-0 lg:pb-9 lg:pl-9">
      <div className="absolute -left-4 top-10 size-32 rounded-full bg-blue-300/35 blur-3xl sm:left-0" />
      <div className="absolute -right-2 bottom-10 size-40 rounded-full bg-indigo-300/35 blur-3xl" />
      <div
        role="img"
        aria-label="Preview of the Task Management dashboard"
        className="relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_32px_80px_-35px_rgba(30,41,59,0.34)] ring-1 ring-white/80"
      >
        <div className="flex h-12 items-center justify-between border-b border-slate-100 px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-indigo-600 text-white">
              <Check aria-hidden="true" size={14} strokeWidth={2.8} />
            </span>
            <span className="text-xs font-semibold tracking-tight text-slate-800">
              Task Management
            </span>
            <span className="ml-2 hidden h-4 w-px bg-slate-200 sm:block" />
            <span className="hidden text-[11px] text-slate-400 sm:block">
              Workspace
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-7 w-36 items-center gap-2 rounded-lg bg-slate-50 px-2.5 text-[10px] text-slate-400 sm:flex">
              <Search aria-hidden="true" size={12} />
              Search tasks...
            </div>
            <span className="relative flex size-8 items-center justify-center rounded-lg text-slate-500">
              <Bell aria-hidden="true" size={15} />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-indigo-500" />
            </span>
            <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-[9px] font-semibold text-white">
              AM
            </span>
          </div>
        </div>

        <div className="grid min-h-[360px] grid-cols-[54px_1fr] sm:grid-cols-[152px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-50/70 p-2 sm:p-3">
            <p className="mb-3 hidden px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 sm:block">
              Menu
            </p>
            <div className="mb-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-50 px-2 py-2 text-indigo-700 sm:justify-start">
              <LayoutGrid aria-hidden="true" size={14} />
              <span className="hidden text-[10px] font-semibold sm:inline">
                Overview
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-slate-500 sm:justify-start">
              <CircleCheck aria-hidden="true" size={14} />
              <span className="hidden text-[10px] sm:inline">My tasks</span>
              <span className="ml-auto hidden rounded bg-white px-1.5 py-0.5 text-[9px] text-slate-500 sm:inline">
                8
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-slate-500 sm:justify-start">
              <CalendarDays aria-hidden="true" size={14} />
              <span className="hidden text-[10px] sm:inline">Calendar</span>
            </div>
            <div className="my-4 hidden h-px bg-slate-200 sm:block" />
            <div className="hidden items-center gap-2 px-2 text-[9px] text-slate-400 sm:flex">
              <span className="size-2 rounded-full bg-indigo-400" />
              Product launch
            </div>
            <div className="mt-3 hidden items-center gap-2 px-2 text-[9px] text-slate-400 sm:flex">
              <span className="size-2 rounded-full bg-blue-400" />
              Website refresh
            </div>
          </aside>

          <div className="min-w-0 p-3 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[9px] font-medium text-slate-400">
                  Wednesday, October 8, 2026
                </p>
                <h2 className="mt-1 text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
                  Good morning, Alex
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-sm shadow-indigo-600/20">
                <Plus aria-hidden="true" size={12} />
                New task
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
              <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm shadow-slate-900/[0.02] sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 sm:text-[9px]">
                    Total tasks
                  </span>
                  <LayoutGrid
                    aria-hidden="true"
                    className="text-indigo-500"
                    size={13}
                  />
                </div>
                <p className="mt-1.5 text-lg font-semibold leading-none text-slate-900 sm:text-xl">
                  24
                </p>
                <p className="mt-1 hidden text-[8px] text-slate-400 sm:block">
                  Across 3 projects
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm shadow-slate-900/[0.02] sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 sm:text-[9px]">
                    Completed
                  </span>
                  <CircleCheck
                    aria-hidden="true"
                    className="text-emerald-500"
                    size={13}
                  />
                </div>
                <p className="mt-1.5 text-lg font-semibold leading-none text-slate-900 sm:text-xl">
                  16
                </p>
                <p className="mt-1 hidden text-[8px] text-emerald-600 sm:block">
                  +4 this week
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm shadow-slate-900/[0.02] sm:p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-500 sm:text-[9px]">
                    On track
                  </span>
                  <TrendingUp
                    aria-hidden="true"
                    className="text-blue-500"
                    size={13}
                  />
                </div>
                <p className="mt-1.5 text-lg font-semibold leading-none text-slate-900 sm:text-xl">
                  92%
                </p>
                <p className="mt-1 hidden text-[8px] text-slate-400 sm:block">
                  Great momentum
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3 shadow-sm shadow-slate-900/[0.02] sm:mt-5 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-semibold text-slate-800 sm:text-[11px]">
                    Today&apos;s priorities
                  </h3>
                  <p className="mt-0.5 text-[8px] text-slate-400">
                    Keep your momentum going
                  </p>
                </div>
                <span className="text-slate-400">
                  <MoreHorizontal aria-hidden="true" size={16} />
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <div
                    className="flex items-center gap-2.5 py-2.5 sm:gap-3"
                    key={task.title}
                  >
                    <span
                      className={`size-2 shrink-0 rounded-full ${task.color}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-medium text-slate-700 sm:text-[10px]">
                        {task.title}
                      </p>
                      <p className="mt-0.5 truncate text-[8px] text-slate-400">
                        {task.detail}
                      </p>
                    </div>
                    <span
                      className={`hidden rounded-md px-2 py-1 text-[8px] font-medium sm:inline-block ${task.tagColor}`}
                    >
                      {task.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-50/70 px-3 py-2">
              <Sparkles
                aria-hidden="true"
                className="shrink-0 text-indigo-500"
                size={13}
              />
              <p className="text-[8px] leading-4 text-indigo-900 sm:text-[9px]">
                You&apos;re building a great rhythm. Keep it up!
              </p>
              <Clock3
                aria-hidden="true"
                className="ml-auto shrink-0 text-indigo-400"
                size={12}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 left-1 hidden items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-[0_16px_45px_-18px_rgba(30,41,59,0.25)] backdrop-blur sm:flex">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Check aria-hidden="true" size={18} />
        </span>
        <span>
          <span className="block text-xs font-semibold text-slate-900">
            You&apos;re on track!
          </span>
          <span className="mt-0.5 block text-[10px] text-slate-500">
            4 tasks completed today
          </span>
        </span>
      </div>
    </div>
  )
}

export default DashboardPreview
