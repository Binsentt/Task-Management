import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  ListChecks,
  Sparkles,
} from 'lucide-react'
import DashboardPreview from '../components/DashboardPreview.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import Navigation, { Brand } from '../components/Navigation.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

const features = [
  {
    icon: ListChecks,
    title: 'Task Organization',
    description:
      'Keep every to-do in one clear place. Group your tasks by project, priority, or whatever works for you.',
    tone: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description:
      'See how far you have come at a glance, celebrate small wins, and keep your goals moving forward.',
    tone: 'bg-blue-50 text-blue-600',
  },
  {
    icon: CalendarCheck2,
    title: 'Deadline Management',
    description:
      'Stay ahead of important dates with a simple view of what is due today, tomorrow, and next.',
    tone: 'bg-sky-50 text-sky-600',
  },
  {
    icon: Lightbulb,
    title: 'Productivity Insights',
    description:
      'Build better routines with a thoughtful overview of your workload and completed work.',
    tone: 'bg-violet-50 text-violet-600',
  },
]

const steps = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Create Your Tasks',
    description:
      'Capture everything on your mind and turn your ideas into clear, manageable next steps.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Organize Your Workflow',
    description:
      'Sort tasks into projects, set priorities, and make a plan that fits the way you work.',
  },
  {
    number: '03',
    icon: Check,
    title: 'Track Your Progress',
    description:
      'Check off each win, keep an eye on deadlines, and see your momentum build day by day.',
  },
]

function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-indigo-700 focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navigation />

      <main id="main-content">
        <section
          id="home"
          aria-labelledby="hero-title"
          className="relative isolate scroll-mt-24"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_8%,rgba(224,231,255,0.8),transparent_38%),radial-gradient(ellipse_at_55%_60%,rgba(239,246,255,0.75),transparent_40%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-8 lg:px-10 lg:pb-28 lg:pt-24">
            <div className="max-w-xl lg:pb-5">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm shadow-indigo-900/[0.03] sm:text-sm">
                <span className="flex size-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Sparkles aria-hidden="true" size={12} />
                </span>
                A little more focus, every day
              </div>
              <h1
                id="hero-title"
                className="max-w-xl text-[2.65rem] leading-[1.08] font-semibold tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.15rem]"
              >
                Organize Your Tasks.{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Achieve More.
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Stay organized, manage your tasks efficiently, and boost your
                productivity with our simple task management system.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#get-started"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25"
                >
                  Get Started
                  <ArrowRight aria-hidden="true" size={17} />
                </a>
                <a
                  href="#features"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-6 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700"
                >
                  Learn More
                  <ArrowDown aria-hidden="true" size={16} />
                </a>
              </div>
              <div className="mt-9 flex items-center gap-3 text-xs text-slate-500 sm:text-sm">
                <span className="flex -space-x-2">
                  <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[9px] font-semibold text-indigo-700">
                    AM
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[9px] font-semibold text-blue-700">
                    JR
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-[9px] font-semibold text-violet-700">
                    SK
                  </span>
                </span>
                <span>
                  A simpler way to make progress
                  <span className="block text-[11px] text-slate-400">
                    Your next focused day starts here
                  </span>
                </span>
              </div>
            </div>

            <DashboardPreview />
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-24 border-y border-slate-100 bg-slate-50/75 px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              titleId="features-title"
              eyebrow="Everything in its place"
              title="A clear path from busy to productive"
              description="The essentials to organize your day, stay on top of deadlines, and feel good about the progress you make."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section
          id="about"
          aria-labelledby="how-it-works-title"
          className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div id="how-it-works" className="scroll-mt-24">
              <SectionHeading
                titleId="how-it-works-title"
                eyebrow="A better rhythm"
                title="How it works"
                description="A simple routine makes it easier to focus on what matters, one small step at a time."
              />
              <div className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
                <div className="absolute left-[16.5%] right-[16.5%] top-7 hidden h-px bg-gradient-to-r from-indigo-100 via-blue-200 to-indigo-100 sm:block" />
                {steps.map(({ number, icon: Icon, title, description }) => (
                  <article
                    key={number}
                    className="relative flex flex-col items-center text-center"
                  >
                    <span className="relative flex size-14 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-md shadow-indigo-950/[0.05]">
                      <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
                      <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-[9px] font-bold text-white">
                        {number.slice(-1)}
                      </span>
                    </span>
                    <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-indigo-600">
                      STEP {number}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-20 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 px-6 py-10 text-white shadow-xl shadow-indigo-950/15 sm:px-10 sm:py-12 lg:mt-24 lg:px-14">
              <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                <div className="max-w-2xl">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-50">
                    <Sparkles aria-hidden="true" size={13} />
                    Your next win is one step away
                  </span>
                  <h2 className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                    Start Managing Your Tasks Today
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
                    Make room for focused work with a simple system that keeps
                    your priorities moving forward.
                  </p>
                </div>
                <a
                  id="get-started"
                  href="#home"
                  className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-950/10 transition hover:-translate-y-0.5 hover:bg-indigo-50"
                >
                  Get Started
                  <ChevronRight aria-hidden="true" size={17} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50/70 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Brand footer />
            <p className="mt-3 text-xs text-slate-500">
              Simple tools for more focused days.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <li>
                <a className="transition hover:text-indigo-700" href="#home">
                  Home
                </a>
              </li>
              <li>
                <a
                  className="transition hover:text-indigo-700"
                  href="#features"
                >
                  Features
                </a>
              </li>
              <li>
                <a className="transition hover:text-indigo-700" href="#about">
                  About
                </a>
              </li>
            </ul>
          </nav>
          <p className="text-xs text-slate-500 sm:text-right">
            © {new Date().getFullYear()} Task Management System. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
