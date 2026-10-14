import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
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
  getOrganization: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
})

beforeEach(() => {
  authApi.me.mockRejectedValue({ response: { status: 401 } })
})

describe('authentication routes', () => {
  it('deduplicates session restoration in Strict Mode and treats a missing session as anonymous', async () => {
    window.history.replaceState({}, '', '/signup')
    authApi.me.mockRejectedValue({ response: { status: 401 } })
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )

    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeTruthy()
    expect(authApi.me).toHaveBeenCalledTimes(1)
  })

  it('offers a retry after a genuine session-check network failure', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/signup')
    authApi.me
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce({ response: { status: 401 } })
    render(<App />)

    expect(await screen.findByRole('heading', { name: /couldn't check your session/i })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeTruthy()
    expect(authApi.me).toHaveBeenCalledTimes(2)
  })

  it('keeps server errors distinct from anonymous sessions and permits retry', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    authApi.me
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce({ response: { status: 401 } })
    render(<App />)

    expect(await screen.findByRole('heading', { name: /couldn't check your session/i })).toBeTruthy()
    expect(screen.queryByLabelText(/username or email/i)).toBeNull()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByLabelText(/username or email/i)).toBeTruthy()
    expect(authApi.me).toHaveBeenCalledTimes(2)
  })

  it('redirects an anonymous visitor away from protected dashboards', async () => {
    window.history.replaceState({}, '', '/dashboard')
    render(<App />)

    expect(await screen.findByLabelText(/username or email/i)).toBeTruthy()
    expect(window.location.pathname).toBe('/login')
  })

  it.each([
    {
      scope: 'personal',
      user: { _id: 'personal-user', full_name: 'Personal Member', organization: null, org_role: null },
      expectedWorkspace: 'Personal workspace',
      expectedHeading: 'Overview',
      expectedPath: '/dashboard',
      expectedRole: null,
    },
    {
      scope: 'organization',
      user: { _id: 'organization-user', full_name: 'Organization Member', organization: 'server-org', org_role: 'ADMIN' },
      expectedWorkspace: 'Example Company',
      expectedHeading: 'Welcome, Organization Member',
      expectedPath: '/organization',
      expectedRole: 'ADMIN',
    },
  ])('restores a server-authenticated $scope session to its dashboard', async ({
    user,
    expectedWorkspace,
    expectedHeading,
    expectedPath,
    expectedRole,
  }) => {
    window.history.replaceState({}, '', '/login')
    authApi.me.mockResolvedValue({ data: { data: { user } } })
    taskApi.listTasks.mockResolvedValue({ data: { data: { tasks: [] } } })
    taskApi.getOrganization.mockResolvedValue({ data: { data: { name: 'Example Company' } } })
    render(<App />)

    expect(await screen.findByRole('heading', { name: expectedHeading })).toBeTruthy()
    expect((await screen.findAllByText(expectedWorkspace)).length).toBeGreaterThan(0)
    expect(window.location.pathname).toBe(expectedPath)
    if (expectedRole) expect(screen.getByText(expectedRole)).toBeTruthy()
    expect(authApi.me).toHaveBeenCalledTimes(1)
  })

  it('opens signup from every Get Started link', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getAllByRole('link', { name: /get started/i })[0])

    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeTruthy()
    expect(window.location.pathname).toBe('/signup')
  })

  it('shows organization name only when organization account type is selected', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/signup')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeTruthy()
    expect(screen.queryByLabelText(/organization name/i)).toBeNull()
    await user.click(screen.getByRole('radio', { name: /organization/i }))

    expect(screen.getByLabelText(/organization name/i)).toBeTruthy()
  })

  it('shows user-facing password requirements after interaction and updates confirmation feedback', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/signup')
    render(<App />)

    const password = await screen.findByLabelText(/^password$/i)
    const confirmation = screen.getByLabelText(/re-enter password/i)

    expect(screen.queryByText(/password requirements/i)).toBeNull()
    expect(screen.queryByText(/at most 72 utf-8 bytes/i)).toBeNull()

    await user.click(password)
    expect(screen.getByText(/password requirements/i)).toBeTruthy()
    expect(screen.queryByText(/at most 72 utf-8 bytes/i)).toBeNull()
    expect(screen.getByText('Weak')).toBeTruthy()

    fireEvent.change(password, { target: { value: 'StrongPass1!' } })
    expect(screen.getByText('Strong')).toBeTruthy()
    for (const requirement of [
      'At least 8 characters',
      'An uppercase letter',
      'A lowercase letter',
      'A number',
      'A symbol',
    ]) {
      expect(screen.getByText(requirement)).toBeTruthy()
    }

    fireEvent.change(confirmation, { target: { value: 'Different1!' } })
    expect(screen.getByText(/passwords do not match/i)).toBeTruthy()

    fireEvent.change(confirmation, { target: { value: 'StrongPass1!' } })
    expect(screen.queryByText(/passwords do not match/i)).toBeNull()

    fireEvent.change(password, { target: { value: 'AnotherStrong2!' } })
    expect(screen.getByText(/passwords do not match/i)).toBeTruthy()

    fireEvent.change(confirmation, { target: { value: 'AnotherStrong2!' } })
    expect(screen.queryByText(/passwords do not match/i)).toBeNull()

    fireEvent.change(password, { target: { value: `Aa1!${'😊'.repeat(18)}` } })
    expect(screen.getByText(/password is too long/i)).toBeTruthy()
    expect(screen.queryByText(/72 utf-8 bytes/i)).toBeNull()
  })

  it('sanitizes pasted full names and reports duplicate usernames', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/signup')
    authApi.checkAvailability.mockResolvedValue({ data: { data: { available: true } } })
    authApi.register.mockRejectedValue({
      response: { status: 409, data: { message: 'Username already taken' } },
    })
    render(<App />)

    const fullName = await screen.findByLabelText(/full name/i)
    await user.type(fullName, 'Ana')
    fireEvent.paste(fullName, { clipboardData: { getData: () => '  2! María  ' } })
    fireEvent.change(fullName, { target: { value: 'Ana 2! María' } })
    expect(fullName.value).toBe('Ana María')

    await user.type(screen.getByLabelText(/^username$/i), 'taken.name')
    await user.type(screen.getByLabelText(/^email$/i), 'taken@gmail.com')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!')
    await user.type(screen.getByLabelText(/re-enter password/i), 'StrongPass1!')
    await user.type(screen.getByLabelText(/contact number/i), '00123456')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(authApi.register).toHaveBeenCalled())
    expect(await screen.findByText(/username already taken/i)).toBeTruthy()
  }, 10000)

  it('provides login and forgot-password pages with reciprocal links', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    render(<App />)

    expect(await screen.findByLabelText(/username or email/i)).toBeTruthy()
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy()
    await user.click(screen.getByRole('link', { name: /forgot password/i }))
    expect(await screen.findByRole('heading', { name: /reset your password/i })).toBeTruthy()
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy()
  })

  it('validates Gmail and password confirmation after interaction and restricts contact input', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/signup')
    render(<App />)

    const email = await screen.findByLabelText(/^email$/i)
    expect(screen.queryByText(/must end in @gmail\.com/i)).toBeNull()
    await user.type(email, 'person@gmail.com.example')
    expect(await screen.findByText(/must end in @gmail\.com/i)).toBeTruthy()

    const contact = screen.getByLabelText(/contact number/i)
    fireEvent.change(contact, { target: { value: '00+12abc-34' } })
    expect(contact.value).toBe('001234')

    const password = screen.getByLabelText(/^password$/i)
    const confirmation = screen.getByLabelText(/re-enter password/i)
    await user.type(password, 'StrongPass1!')
    await user.type(confirmation, 'DifferentPass1!')
    expect(await screen.findByText(/passwords do not match/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    await user.click(screen.getByRole('button', { name: 'Show confirmation' }))
    expect(password.type).toBe('text')
    expect(confirmation.type).toBe('text')
  })

  it('registers organizations and routes using the server-returned membership', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/signup')
    authApi.checkAvailability.mockResolvedValue({ data: { data: { available: true } } })
    authApi.register.mockResolvedValue({
      data: { data: { user: { _id: 'server-user', full_name: 'Zoë Example', organization: 'server-org', org_role: 'ADMIN' } } },
    })
    taskApi.listTasks.mockResolvedValue({ data: { data: { tasks: [] } } })
    taskApi.getOrganization.mockResolvedValue({ data: { data: { name: 'Example Company' } } })
    render(<App />)

    await user.type(await screen.findByLabelText(/full name/i), 'Zoë Example')
    await user.type(screen.getByLabelText(/^username$/i), 'zoe.example')
    await user.type(screen.getByLabelText(/^email$/i), 'zoe@gmail.com')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!')
    await user.type(screen.getByLabelText(/re-enter password/i), 'StrongPass1!')
    await user.type(screen.getByLabelText(/contact number/i), '001234567')
    await user.click(screen.getByRole('radio', { name: /organization/i }))
    await user.type(screen.getByLabelText(/organization name/i), 'Example Company')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('heading', { name: /welcome, zoë example/i })).toBeTruthy()
    expect(await screen.findByText('Example Company')).toBeTruthy()
    expect(screen.getByText('ADMIN')).toBeTruthy()
    expect(authApi.register).toHaveBeenCalledWith(expect.objectContaining({
      account_type: 'organization',
      organization_name: 'Example Company',
      contact_number: '001234567',
    }))
  }, 10000)

  it('routes login from the server user and clears the session on logout', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/login')
    authApi.login.mockResolvedValue({
      data: { data: { user: { _id: 'server-user', full_name: 'A. Member', organization: null, org_role: null } } },
    })
    authApi.logout.mockResolvedValue({ data: { status: 200 } })
    taskApi.listTasks.mockResolvedValue({ data: { data: { tasks: [] } } })
    render(<App />)

    await user.type(await screen.findByLabelText(/username or email/i), 'member.name')
    await user.type(screen.getByLabelText(/^password$/i), 'legacy-password')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()
    expect(window.location.pathname).toBe('/dashboard')
    expect(authApi.login).toHaveBeenCalledWith({ identifier: 'member.name', password: 'legacy-password' })
    const dashboardNavigation = screen.getByRole('navigation', { name: 'Dashboard navigation' })
    await user.click(within(dashboardNavigation.closest('aside')).getByRole('button', { name: /log out/i }))
    expect(await screen.findByRole('heading', { name: /log in to your account/i })).toBeTruthy()
  })
})
