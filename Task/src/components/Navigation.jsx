import { useState } from 'react'
import { ArrowRight, CheckSquare2, Menu, X } from 'lucide-react'

const navigationLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
]

function Brand({ footer = false }) {
  return (
    <a
      href="#home"
      className="group inline-flex items-center gap-2.5 font-semibold tracking-tight text-slate-950"
      aria-label="Task Management System home"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-600/20 transition-transform group-hover:-rotate-3">
        <CheckSquare2 aria-hidden="true" size={19} strokeWidth={2.2} />
      </span>
      <span className="text-[15px]">
        Task <span className="text-indigo-600">Management</span>
        {footer ? (
          <span className="block text-xs font-normal tracking-normal text-slate-500">
            Task Management System
          </span>
        ) : null}
      </span>
    </a>
  )
}

function LinkList({ onNavigate, mobile = false }) {
  return (
    <ul
      className={
        mobile
          ? 'flex flex-col gap-1'
          : 'hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex'
      }
    >
      {navigationLinks.map(({ label, href }) => (
        <li key={label}>
          <a
            href={href}
            onClick={onNavigate}
            className="inline-flex min-h-11 items-center transition-colors hover:text-indigo-700 md:min-h-0"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  )
}

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/75 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Brand />

        <nav aria-label="Primary navigation" className="flex items-center gap-9">
          <LinkList />
          <a
            href="#get-started"
            className="hidden min-h-11 items-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md md:inline-flex"
          >
            Get Started
            <ArrowRight aria-hidden="true" size={16} />
          </a>
        </nav>

        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 md:hidden"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? (
            <X aria-hidden="true" size={20} />
          ) : (
            <Menu aria-hidden="true" size={20} />
          )}
        </button>
      </div>

      {isMenuOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-slate-100 bg-white px-5 py-3 shadow-lg shadow-slate-900/5 sm:px-8 md:hidden"
        >
          <LinkList mobile onNavigate={closeMenu} />
          <a
            href="#get-started"
            onClick={closeMenu}
            className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Get Started
            <ArrowRight aria-hidden="true" size={16} />
          </a>
        </nav>
      ) : null}
    </header>
  )
}

export { Brand }
export default Navigation
