import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import * as authApi from './api/authApi.js'
import * as taskApi from './api/taskApi.js'

vi.mock('./api/authApi.js', () => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  checkAvailability: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('./api/taskApi.js', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getOrganization: vi.fn(),
}))

const personalUser = {
  _id: 'personal-1',
  full_name: 'Alex Member',
  username: 'alex',
  organization: null,
}

const organizationUser = {
  _id: 'organization-1',
  full_name: 'Org Member',
  username: 'org-member',
  organization: 'organization-1',
  org_role: 'ADMIN',
}

function authenticate(user) {
  authApi.me.mockResolvedValue({ data: { data: { user } } })
}

function initializeTaskList() {
  taskApi.listTasks.mockResolvedValue({
    data: { data: { tasks: [], pages: 1, total: 0 } },
  })
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  window.history.replaceState({}, '', '/')
})

beforeEach(() => {
  authenticate(personalUser)
  initializeTaskList()
  authApi.logout.mockResolvedValue({})
})

describe('protected dashboard routes and shared shell', () => {
  it('keeps the personal shell and navigation while switching nested routes', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()
    const sidebar = screen.getByRole('navigation', { name: 'Dashboard navigation' })
    expect(within(sidebar.closest('aside')).getByText('Task Management')).toBeTruthy()
    expect(within(sidebar.closest('aside')).getByText('Personal workspace')).toBeTruthy()
    expect(screen.getByLabelText('Signed in as Alex Member').textContent).toBe('AM')
    expect(within(sidebar).getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe('/dashboard')
    expect(within(sidebar).getByRole('link', { name: 'My Tasks' }).getAttribute('href')).toBe('/dashboard/tasks')
    expect(within(sidebar).getByRole('link', { name: 'Calendar' }).getAttribute('href')).toBe('/dashboard/calendar')

    await user.click(within(sidebar).getByRole('link', { name: 'My Tasks' }))
    expect(await screen.findByRole('heading', { name: 'My Tasks' })).toBeTruthy()
    expect(window.location.pathname).toBe('/dashboard/tasks')
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBe(sidebar)

    await user.click(within(sidebar).getByRole('link', { name: 'Calendar' }))
    expect(within(screen.getByRole('banner')).getByRole('heading', { name: 'Calendar' })).toBeTruthy()
    expect(window.location.pathname).toBe('/dashboard/calendar')
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBe(sidebar)
  })

  it('keeps organization access protected and redirects users to their matching dashboard', async () => {
    window.history.replaceState({}, '', '/organization')
    authenticate(organizationUser)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Welcome, Org Member' })).toBeTruthy()
    expect(window.location.pathname).toBe('/organization')
    expect(screen.queryByRole('navigation', { name: 'Dashboard navigation' })).toBeNull()

    cleanup()
    window.history.replaceState({}, '', '/organization')
    authenticate(personalUser)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()
    expect(window.location.pathname).toBe('/dashboard')

    cleanup()
    window.history.replaceState({}, '', '/dashboard')
    authenticate(organizationUser)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Welcome, Org Member' })).toBeTruthy()
    expect(window.location.pathname).toBe('/organization')
  })

  it('opens the mobile navigation accessibly and closes it by Escape, backdrop, and navigation', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    const menuButton = await screen.findByRole('button', { name: 'Open navigation' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    await user.click(menuButton)

    let drawer = screen.getByRole('navigation', { name: 'Mobile dashboard navigation' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    for (const [label, path] of [
      ['Overview', '/dashboard'],
      ['My Tasks', '/dashboard/tasks'],
      ['Calendar', '/dashboard/calendar'],
    ]) {
      expect(within(drawer).getByRole('link', { name: label }).getAttribute('href')).toBe(path)
    }

    await user.keyboard('{Escape}')
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Mobile dashboard navigation' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(menuButton))

    await user.click(menuButton)
    drawer = screen.getByRole('navigation', { name: 'Mobile dashboard navigation' })
    await user.click(screen.getByRole('button', { name: 'Close navigation backdrop' }))
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Mobile dashboard navigation' })).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(menuButton))

    await user.click(menuButton)
    drawer = screen.getByRole('navigation', { name: 'Mobile dashboard navigation' })
    await user.click(within(drawer).getByRole('link', { name: 'Calendar' }))
    await waitFor(() => expect(menuButton.getAttribute('aria-expanded')).toBe('false'))
    expect(window.location.pathname).toBe('/dashboard/calendar')
    await waitFor(() => expect(document.activeElement).toBe(menuButton))
  })

  it('moves focus into the mobile drawer, traps Tab, and makes the page inert', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    const menuButton = await screen.findByRole('button', { name: 'Open navigation' })
    await user.click(menuButton)

    const drawer = document.getElementById('mobile-dashboard-drawer')
    const closeButton = within(drawer).getByRole('button', { name: 'Close navigation' })
    const overviewLink = within(drawer).getByRole('link', { name: 'Overview' })
    const logoutButton = within(drawer).getByRole('button', { name: 'Log out' })
    expect(document.activeElement).toBe(closeButton)
    expect(drawer.closest('div.fixed')).toBeTruthy()
    expect(document.querySelector('header').parentElement.hasAttribute('inert')).toBe(true)

    await user.tab()
    expect(document.activeElement).toBe(overviewLink)
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(closeButton)

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(logoutButton)
    await user.tab()
    expect(document.activeElement).toBe(closeButton)
  })

  it('logs out and navigates only after logout succeeds', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()

    const sidebar = screen.getByRole('navigation', { name: 'Dashboard navigation' })
    await user.click(within(sidebar.closest('aside')).getByRole('button', { name: 'Log out' }))
    expect(await screen.findByLabelText(/username or email/i)).toBeTruthy()
    expect(authApi.logout).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/login')
  })

  it('shows logout errors without leaving the protected route', async () => {
    const user = userEvent.setup()
    authApi.logout.mockRejectedValue({
      response: { status: 503, data: { message: 'Logout unavailable' } },
    })
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()

    const sidebar = screen.getByRole('navigation', { name: 'Dashboard navigation' })
    await user.click(within(sidebar.closest('aside')).getByRole('button', { name: 'Log out' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Logout unavailable')
    expect(window.location.pathname).toBe('/dashboard')
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeTruthy()
  })

  it('submits a search query to My Tasks with the query URL-encoded', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()

    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'plan & ship')
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'My Tasks' })).toBeTruthy()
    expect(window.location.pathname).toBe('/dashboard/tasks')
    expect(window.location.search).toBe('?q=plan%20%26%20ship')
    expect(new URLSearchParams(window.location.search).get('q')).toBe('plan & ship')
  })
})

function task(id, title, status, deadline) {
  return {
    _id: id,
    title,
    status,
    priority: 'MEDIUM',
    content: '',
    deadline: deadline ? new Date(...deadline).toISOString() : null,
  }
}

function taskPage(tasks, pages = 1) {
  return { data: { data: { tasks, pages, total: tasks.length } } }
}

describe('dashboard overview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 14, 12), toFake: ['Date'] })
  })

  it('shows personal task counts and unique priorities ordered by urgency', async () => {
    taskApi.listTasks
      .mockResolvedValueOnce(taskPage([
        { ...task('later', 'Later today', 'IN_PROGRESS', [2026, 9, 14, 16]), priority: 'HIGH' },
        task('overdue', 'Overdue task', 'IN_PROGRESS', [2026, 9, 13, 23]),
        task('within', 'Within seven days', 'TO_DO', [2026, 9, 20, 12]),
        task('outside', 'Outside seven days', 'TO_DO', [2026, 9, 21, 12, 1]),
        task('early', 'Due earlier today', 'TO_DO', [2026, 9, 14, 9]),
      ], 2))
      .mockResolvedValueOnce(taskPage([
        task('same-time', 'Same-time priority', 'TO_DO', [2026, 9, 14, 9]),
        task('completed', 'Completed near deadline', 'DONE', [2026, 9, 14, 10]),
        { ...task('no-deadline', 'No deadline', 'TO_DO', null), priority: 'HIGH' },
      ], 2))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    const overview = await screen.findByRole('heading', { name: "Today's priorities" })
    for (const [label, count] of [
      ['Total tasks', '8'],
      ['Completed', '1'],
      ['In Progress', '2'],
      ['Overdue', '3'],
    ]) {
      const heading = screen.getByRole('heading', { name: label })
      expect(heading.closest('article').querySelector('p').textContent).toBe(count)
    }

    const priorities = within(overview.closest('section'))
    expect([...priorities.getAllByRole('heading', { level: 3 })].map((heading) => heading.textContent))
      .toEqual([
        'Overdue task',
        'Due earlier today',
        'Same-time priority',
        'Later today',
        'Within seven days',
        'No deadline',
      ])
    expect(within(overview.closest('section')).queryByRole('heading', { name: 'Outside seven days' })).toBeNull()
    expect(within(overview.closest('section')).queryByRole('heading', { name: 'Completed near deadline' })).toBeNull()
    expect(within(overview.closest('section')).getAllByRole('heading', { name: 'Later today' })).toHaveLength(1)
    expect(within(overview.closest('section')).getAllByText('High priority').length).toBeGreaterThan(0)
    expect(taskApi.listTasks).toHaveBeenNthCalledWith(1, 'personal', 1, 100)
    expect(taskApi.listTasks).toHaveBeenNthCalledWith(2, 'personal', 2, 100)

    await userEvent.setup().click(screen.getByRole('button', { name: 'New Task' }))
    expect(screen.getByRole('dialog', { name: 'Create task' })).toBeTruthy()
  })

  it('counts overdue only after the exact deadline and excludes completed or undated tasks', async () => {
    const exactlyNow = task('exactly-now', 'Due exactly now', 'TO_DO', [2026, 9, 14, 12])
    const oneMillisecondPast = {
      ...task('past-now', 'Just overdue', 'TO_DO', [2026, 9, 14, 11, 59]),
      deadline: new Date(2026, 9, 14, 11, 59, 59, 999).toISOString(),
    }
    const completedPast = task('completed-past', 'Completed overdue', 'DONE', [2026, 9, 13, 12])
    const noDeadline = task('undated', 'No deadline task', 'IN_PROGRESS', null)
    taskApi.listTasks.mockResolvedValue(taskPage([exactlyNow, oneMillisecondPast, completedPast, noDeadline]))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await screen.findByRole('heading', { name: "Today's priorities" })
    const overdueCard = screen.getByRole('heading', { name: 'Overdue' }).closest('article')
    expect(overdueCard.querySelector('p').textContent).toBe('1')
    const priorities = within(screen.getByRole('heading', { name: "Today's priorities" }).closest('section'))
    expect(priorities.getByRole('heading', { name: 'Just overdue' })).toBeTruthy()
    expect(priorities.getByRole('heading', { name: 'Due exactly now' })).toBeTruthy()
    expect(priorities.queryByRole('heading', { name: 'Completed overdue' })).toBeNull()
    expect(priorities.queryByRole('heading', { name: 'No deadline task' })).toBeNull()
  })

  it('includes tasks due exactly seven days ahead but excludes a deadline one millisecond later', async () => {
    const atCutoff = task('at-cutoff', 'At the seven-day cutoff', 'TO_DO', [2026, 9, 21, 12])
    const afterCutoff = {
      ...task('after-cutoff', 'After the seven-day cutoff', 'TO_DO', [2026, 9, 21, 12]),
      deadline: new Date(2026, 9, 21, 12, 0, 0, 1).toISOString(),
    }
    taskApi.listTasks.mockResolvedValue(taskPage([atCutoff, afterCutoff]))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    const priorities = within((await screen.findByRole('heading', { name: "Today's priorities" })).closest('section'))
    expect(priorities.getByRole('heading', { name: 'At the seven-day cutoff' })).toBeTruthy()
    expect(priorities.queryByRole('heading', { name: 'After the seven-day cutoff' })).toBeNull()
  })

  it('uses local calendar dates at midnight when selecting due-today tasks', async () => {
    vi.setSystemTime(new Date(2026, 9, 15, 0, 1))
    const beforeMidnight = task('previous-day', 'Previous local day', 'TO_DO', [2026, 9, 14, 23, 59])
    const afterMidnight = task('today', 'Current local day', 'TO_DO', [2026, 9, 15, 0, 2])
    taskApi.listTasks.mockResolvedValue(taskPage([beforeMidnight, afterMidnight]))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    const prioritiesHeading = await screen.findByRole('heading', { name: "Today's priorities" })
    const priorities = within(prioritiesHeading.closest('section'))
    expect(priorities.getByRole('heading', { name: 'Previous local day' })).toBeTruthy()
    expect(priorities.getByRole('heading', { name: 'Current local day' })).toBeTruthy()
    expect(priorities.getByText('Overdue')).toBeTruthy()
    expect(priorities.getByText('Due today')).toBeTruthy()
  })

  it('distinguishes an empty account from an account with no current priorities', async () => {
    taskApi.listTasks.mockResolvedValueOnce(taskPage([]))
    window.history.replaceState({}, '', '/dashboard')
    const { unmount } = render(<App />)

    expect(await screen.findByText(/No personal tasks yet/i)).toBeTruthy()
    expect(screen.getByText(/No tasks due today/i)).toBeTruthy()

    unmount()
    taskApi.listTasks.mockResolvedValueOnce(taskPage([
      task('later-low', 'Later low priority', 'TO_DO', [2026, 9, 21, 13]),
    ]))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByText(/No tasks due today/i)).toBeTruthy()
    expect(screen.queryByText(/No personal tasks yet/i)).toBeNull()
  })

  it('opens a selected priority in the existing edit dialog and reflects confirmed edits', async () => {
    const user = userEvent.setup()
    const original = {
      ...task('edit-overview', 'Original priority', 'TO_DO', [2026, 9, 14, 14]),
      content: 'Keep these details',
      priority: 'HIGH',
      checklist: [{ _id: 'check-1', text: 'Review', isDone: false, order: 0 }],
    }
    const confirmed = { ...original, title: 'Updated priority', priority: 'LOW' }
    taskApi.listTasks.mockResolvedValue(taskPage([original]))
    taskApi.updateTask.mockResolvedValue({ data: { data: confirmed } })
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Original priority' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit task' })
    expect(within(dialog).getByLabelText('Description').value).toBe('Keep these details')
    expect(within(dialog).getByLabelText('Checklist item 1').value).toBe('Review')
    await user.clear(within(dialog).getByLabelText('Task title'))
    await user.type(within(dialog).getByLabelText('Task title'), 'Updated priority')
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'LOW')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Overdue' }).closest('article').querySelector('p').textContent).toBe('0')
    const priorities = within(screen.getByRole('heading', { name: "Today's priorities" }).closest('section'))
    expect(priorities.getByRole('heading', { name: 'Updated priority' })).toBeTruthy()
    expect(priorities.queryByRole('heading', { name: 'Original priority' })).toBeNull()
    expect(taskApi.updateTask).toHaveBeenCalledWith('edit-overview', expect.objectContaining({
      title: 'Updated priority',
      priority: 'LOW',
    }))
  })

  it('updates summary counts and priority entries from the confirmed task-create response', async () => {
    const user = userEvent.setup()
    taskApi.createTask.mockResolvedValue({
      data: {
        data: {
          _id: 'new-overview-task',
          title: 'New urgent task',
          content: 'Created successfully',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          deadline: new Date(2026, 9, 14, 15).toISOString(),
        },
      },
    })
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'New Task' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create task' })
    await user.type(within(dialog).getByLabelText('Task title'), 'New urgent task')
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'HIGH')
    await user.type(within(dialog).getByLabelText(/Deadline date/), '2026-10-14')
    await user.type(within(dialog).getByLabelText(/Deadline time/), '15:00')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Total tasks' }).closest('article').querySelector('p').textContent).toBe('1')
    expect(screen.getByRole('heading', { name: 'In Progress' }).closest('article').querySelector('p').textContent).toBe('1')
    expect(screen.getByRole('heading', { name: 'New urgent task' })).toBeTruthy()
  })

  it('updates summary and priorities from the confirmed completion response', async () => {
    const user = userEvent.setup()
    const activeTask = task('complete-overview', 'Finish the draft', 'IN_PROGRESS', [2026, 9, 14, 15])
    const completedTask = { ...activeTask, status: 'DONE' }
    taskApi.listTasks.mockResolvedValue(taskPage([activeTask]))
    taskApi.updateTask.mockResolvedValue({ data: { data: completedTask } })
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Mark Finish the draft complete' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Completed' }).closest('article').querySelector('p').textContent).toBe('1')
    })
    expect(screen.getByRole('heading', { name: 'In Progress' }).closest('article').querySelector('p').textContent).toBe('0')
    expect(screen.queryByRole('heading', { name: 'Finish the draft' })).toBeNull()
    expect(taskApi.updateTask).toHaveBeenCalledWith('complete-overview', { status: 'DONE' })
  })

  it('updates totals immediately after a confirmed task deletion', async () => {
    const user = userEvent.setup()
    const activeTask = task('delete-overview', 'Remove this task', 'TO_DO', [2026, 9, 14, 15])
    taskApi.listTasks.mockResolvedValue(taskPage([activeTask]))
    taskApi.deleteTask.mockResolvedValue({ data: { status: 200 } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Delete Remove this task' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Total tasks' }).closest('article').querySelector('p').textContent).toBe('0')
    })
    expect(taskApi.deleteTask).toHaveBeenCalledWith('delete-overview')
    expect(confirm).toHaveBeenCalledOnce()
    expect(await screen.findByText(/No personal tasks yet/i)).toBeTruthy()
    confirm.mockRestore()
  })

  it('shows an explicit loading state while tasks are being fetched', async () => {
    let resolveTasks
    taskApi.listTasks.mockReturnValueOnce(new Promise((resolve) => {
      resolveTasks = resolve
    }))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect((await screen.findByRole('status')).textContent).toContain('Loading tasks')
    resolveTasks(taskPage([]))
    expect(await screen.findByText(/No personal tasks yet/i)).toBeTruthy()
  })

  it('shows task-fetch errors with a retry instead of an empty success state', async () => {
    taskApi.listTasks
      .mockRejectedValueOnce(new Error('Task service unavailable'))
      .mockResolvedValue(taskPage([]))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
    expect(screen.queryByText(/No personal tasks yet/i)).toBeNull()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText(/No personal tasks yet/i)).toBeTruthy()
  })

  it('shows empty states for both deadline sections when no tasks are available', async () => {
    taskApi.listTasks.mockResolvedValue(taskPage([]))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByText(/No personal tasks yet/i)).toBeTruthy()
    expect(screen.getByText(/No tasks due today/i)).toBeTruthy()
  })
})

describe('personal task dialog', () => {
  it('creates a task with its details, local deadline, priority, and checklist', async () => {
    const user = userEvent.setup()
    const deadline = new Date(2026, 9, 14, 9, 30).toISOString()
    const confirmedTask = {
      _id: 'created-task',
      title: 'Plan release',
      content: 'Prepare the launch checklist.',
      status: 'TO_DO',
      priority: 'HIGH',
      deadline,
      checklist: [{ _id: 'item-1', text: 'Review notes', isDone: false, order: 0 }],
    }
    taskApi.createTask.mockResolvedValue({ data: { data: confirmedTask } })
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'New Task' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create task' })
    await user.type(within(dialog).getByLabelText('Task title'), 'Plan release')
    await user.type(within(dialog).getByLabelText('Description'), 'Prepare the launch checklist.')
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'HIGH')
    await user.type(within(dialog).getByLabelText(/Deadline date/), '2026-10-14')
    await user.type(within(dialog).getByLabelText(/Deadline time/), '09:30')
    await user.click(within(dialog).getByRole('button', { name: 'Add checklist item' }))
    await user.type(within(dialog).getByLabelText('Checklist item 1'), 'Review notes')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))

    expect(taskApi.createTask).toHaveBeenCalledWith({
      title: 'Plan release',
      content: 'Prepare the launch checklist.',
      deadline,
      priority: 'HIGH',
      checklist: [{ text: 'Review notes', isDone: false, order: 0 }],
      is_org_task: false,
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const totalTasksCard = screen.getByRole('heading', { name: 'Total tasks' }).closest('article')
    expect(totalTasksCard.querySelector('p').textContent).toBe('1')
  })

  it('requires a valid title and date/time pair while allowing no deadline', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'New Task' }))
    let dialog = await screen.findByRole('dialog', { name: 'Create task' })
    await user.type(within(dialog).getByLabelText('Task title'), 'ab')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))
    expect(await within(dialog).findByRole('alert')).toBeTruthy()
    expect(taskApi.createTask).not.toHaveBeenCalled()

    await user.clear(within(dialog).getByLabelText('Task title'))
    await user.type(within(dialog).getByLabelText('Task title'), 'Write release notes')
    await user.type(within(dialog).getByLabelText(/Deadline date/), '2026-10-14')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))
    expect(await within(dialog).findByText(/choose both a deadline date and time/i)).toBeTruthy()
    expect(taskApi.createTask).not.toHaveBeenCalled()

    await user.clear(within(dialog).getByLabelText(/Deadline date/))
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))
    expect(taskApi.createTask).toHaveBeenCalledWith({
      title: 'Write release notes',
      content: '',
      deadline: null,
      priority: 'MEDIUM',
      checklist: [],
      is_org_task: false,
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps form values and displays the backend error when saving fails', async () => {
    const user = userEvent.setup()
    taskApi.createTask.mockRejectedValue({
      response: { status: 503, data: { message: 'Task service unavailable' } },
    })
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'New Task' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create task' })
    const titleInput = within(dialog).getByLabelText('Task title')
    await user.type(titleInput, 'Keep my draft')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))

    expect((await within(dialog).findByRole('alert')).textContent).toContain('Task service unavailable')
    expect(titleInput.value).toBe('Keep my draft')
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  it('moves focus into the dialog, traps keyboard navigation, and restores focus on Escape', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    const trigger = await screen.findByRole('button', { name: 'New Task' })
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Create task' })
    const titleInput = within(dialog).getByLabelText('Task title')
    const closeButton = within(dialog).getByRole('button', { name: 'Close task dialog' })
    const saveButton = within(dialog).getByRole('button', { name: 'Save task' })

    expect(document.activeElement).toBe(titleInput)
    expect(document.querySelector('header').parentElement.hasAttribute('inert')).toBe(true)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(closeButton)
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(saveButton)
    await user.tab()
    expect(document.activeElement).toBe(closeButton)
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('prevents duplicate submissions while the create request is pending', async () => {
    const user = userEvent.setup()
    let resolveCreate
    taskApi.createTask.mockReturnValue(new Promise((resolve) => {
      resolveCreate = resolve
    }))
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'New Task' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create task' })
    await user.type(within(dialog).getByLabelText('Task title'), 'Only one request')
    const saveButton = within(dialog).getByRole('button', { name: 'Save task' })
    await user.click(saveButton)
    expect(saveButton.disabled).toBe(true)
    expect(within(dialog).getByLabelText('Task title').disabled).toBe(true)
    await user.click(saveButton)
    expect(taskApi.createTask).toHaveBeenCalledTimes(1)

    resolveCreate({
      data: { data: { _id: 'created-once', title: 'Only one request', status: 'TO_DO' } },
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('prefills edits with local deadline fields and replaces the task without duplication', async () => {
    const user = userEvent.setup()
    const deadline = new Date(2026, 9, 14, 9, 30).toISOString()
    const existingTask = {
      _id: 'existing-task',
      title: 'Existing task',
      content: 'Existing details',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      deadline,
      checklist: [{ _id: 'existing-item', text: 'Existing step', isDone: true, order: 0 }],
    }
    const updatedTask = { ...existingTask, title: 'Updated task' }
    taskApi.listTasks.mockResolvedValue(taskPage([existingTask]))
    taskApi.updateTask.mockResolvedValue({ data: { data: updatedTask } })
    window.history.replaceState({}, '', '/dashboard/tasks')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Existing task' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit task' })
    expect(within(dialog).getByLabelText('Task title').value).toBe('Existing task')
    expect(within(dialog).getByLabelText('Description').value).toBe('Existing details')
    expect(within(dialog).getByLabelText(/Deadline date/).value).toBe('2026-10-14')
    expect(within(dialog).getByLabelText(/Deadline time/).value).toBe('09:30')
    expect(within(dialog).getByLabelText('Priority').value).toBe('HIGH')
    expect(within(dialog).getByLabelText('Checklist item 1').value).toBe('Existing step')

    await user.clear(within(dialog).getByLabelText('Task title'))
    await user.type(within(dialog).getByLabelText('Task title'), 'Updated task')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))

    expect(taskApi.updateTask).toHaveBeenCalledWith('existing-task', {
      title: 'Updated task',
      content: 'Existing details',
      deadline,
      priority: 'HIGH',
      checklist: [{
        _id: 'existing-item',
        text: 'Existing step',
        isDone: true,
        order: 0,
      }],
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getAllByText('Updated task')).toHaveLength(1)
    expect(screen.queryByText('Existing task')).toBeNull()
  })

  it('leaves an empty deadline empty and preserves edit values after a failed update', async () => {
    const user = userEvent.setup()
    const taskWithoutDeadline = {
      _id: 'undated-task',
      title: 'Plan the review',
      content: 'Bring the draft.',
      status: 'TO_DO',
      priority: 'LOW',
      deadline: null,
      checklist: [],
    }
    taskApi.listTasks.mockResolvedValue(taskPage([taskWithoutDeadline]))
    taskApi.updateTask.mockRejectedValue({
      response: { status: 503, data: { message: 'Update unavailable' } },
    })
    window.history.replaceState({}, '', '/dashboard/tasks')
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Edit Plan the review' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit task' })
    expect(within(dialog).getByLabelText(/Deadline date/).value).toBe('')
    expect(within(dialog).getByLabelText(/Deadline time/).value).toBe('')
    await user.clear(within(dialog).getByLabelText('Task title'))
    await user.type(within(dialog).getByLabelText('Task title'), 'Changed but unsaved')
    await user.click(within(dialog).getByRole('button', { name: 'Save task' }))

    expect(taskApi.updateTask).toHaveBeenCalledWith('undated-task', {
      title: 'Changed but unsaved',
      content: 'Bring the draft.',
      deadline: null,
      priority: 'LOW',
      checklist: [],
    })
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Update unavailable')
    expect(within(dialog).getByLabelText('Task title').value).toBe('Changed but unsaved')
    expect(screen.getByText('Plan the review')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBe(dialog)
  })
})
