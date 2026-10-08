import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import DashboardPage from './DashboardPage.jsx'

const tasks = [
  { id: 'one', title: 'Review proposal', project: 'Product launch', status: 'In progress' },
  { id: 'two', title: 'Design handoff', project: 'Website refresh', status: 'To do' },
]

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

describe('dashboard integration boundary', () => {
  it('keeps an anonymous dashboard request on the landing page', () => {
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Organize Your Tasks. Achieve More.' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull()
  })

  it('renders the dashboard only with a supplied authenticated user', () => {
    window.history.replaceState({}, '', '/dashboard')
    render(<App authenticatedUser={{ name: 'Nicolas Gervacio' }} dashboardProps={{ tasks, now: new Date(2026, 9, 8, 9) }} />)
    expect(screen.getByRole('heading', { name: 'Good morning, Nicolas' })).toBeTruthy()
    expect(screen.getByText('Review proposal')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Organize Your Tasks. Achieve More.' })).toBeNull()
  })
})

describe('dashboard UI', () => {
  it('filters supplied priorities and shows a search empty state', async () => {
    const user = userEvent.setup()
    render(<DashboardPage user={{ name: 'Alex Morgan' }} tasks={tasks} />)
    const input = screen.getAllByRole('searchbox', { name: 'Search tasks' })[0]
    await user.type(input, 'website')
    expect(screen.getByText('Design handoff')).toBeTruthy()
    expect(screen.queryByText('Review proposal')).toBeNull()
    await user.clear(input)
    await user.type(input, 'missing')
    expect(screen.getByRole('status').textContent).toContain('No tasks match your search')
  })

  it('shows empty data without sample names or fabricated metrics', () => {
    render(<DashboardPage user={{ name: 'Nicolas' }} />)
    expect(screen.getByText('No priorities yet')).toBeTruthy()
    expect(screen.getByText('No deadline data yet')).toBeTruthy()
    expect(screen.queryByText('Review project proposal')).toBeNull()
    expect(screen.getByRole('button', { name: 'New task' }).disabled).toBe(true)
  })

  it('hands actions to the supplied callbacks and closes mobile navigation', async () => {
    const user = userEvent.setup()
    const onNewTask = vi.fn()
    const onNavigate = vi.fn()
    const onTaskSelect = vi.fn()
    render(<DashboardPage user={{ name: 'Alex' }} tasks={tasks} onNewTask={onNewTask} onNavigate={onNavigate} onTaskSelect={onTaskSelect} />)
    await user.click(screen.getByRole('button', { name: 'New task' }))
    expect(onNewTask).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Review proposal' }))
    expect(onTaskSelect).toHaveBeenCalledWith(tasks[0])
    await user.click(screen.getByRole('button', { name: 'Open workspace menu' }))
    const menu = screen.getByRole('complementary', { name: 'Mobile workspace menu' })
    await user.click(within(menu).getByRole('button', { name: 'Calendar' }))
    expect(onNavigate).toHaveBeenCalledWith('calendar')
    expect(screen.queryByRole('complementary', { name: 'Mobile workspace menu' })).toBeNull()
  })
})
