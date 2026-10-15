import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import * as authApi from './api/authApi.js'
import * as taskApi from './api/taskApi.js'
import { localDateKey } from './dashboard/taskDates.js'
import { buildTaskReport } from './pages/DashboardReportPage.jsx'

vi.mock('./api/authApi.js', () => ({ me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() }))
vi.mock('./api/taskApi.js', () => ({ listTasks: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn() }))

afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState({}, '', '/') })

describe.each([
  ['personal', '/dashboard', null],
  ['organization', '/organization', 'org-1'],
])('%s workspace features', (scope, base, organization) => {
  it('shows dated tasks in its calendar and offers a report', async () => {
    const user = userEvent.setup()
    const today = localDateKey(new Date())
    const task = { _id: 'task-1', title: 'Prepare summary', status: 'TO_DO', priority: 'HIGH', deadline: `${today}T12:00:00`, content: '' }
    authApi.me.mockResolvedValue({ data: { data: { user: { _id: 'user-1', full_name: 'Alex', organization } } } })
    taskApi.listTasks.mockResolvedValue({ data: { data: { tasks: [task], pages: 1 } } })
    window.history.replaceState({}, '', `${base}/calendar`)
    render(<App />)

    const calendar = await screen.findByRole('region', { name: 'Task calendar' })
    expect(await within(calendar).findByRole('button', { name: `${today}, 1 task` })).toBeTruthy()
    expect(await screen.findByRole('button', { name: /Prepare summary/ })).toBeTruthy()
    expect(taskApi.listTasks).toHaveBeenCalledWith(scope, 1, 100)

    await user.click(within(screen.getByRole('navigation', { name: 'Dashboard navigation' })).getByRole('link', { name: 'Report' }))
    expect(window.location.pathname).toBe(`${base}/report`)
    expect(await screen.findByRole('button', { name: 'Send report' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeTruthy()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    try {
      await user.click(screen.getByRole('button', { name: 'Send report' }))
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('Prepare summary') }))
    } finally {
      delete navigator.share
    }
  })
})

it('escapes spreadsheet values and includes all tasks in the exported report', () => {
  const report = buildTaskReport([{ title: '=1+1', status: 'DONE', priority: 'HIGH', content: 'Line "one"' }], 'personal')
  expect(report.summary).toContain('Completed: 1')
  expect(report.csv).toContain('"Line ""one"""')
  expect(report.csv).toContain('"\'=1+1"')
})
