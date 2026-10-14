import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

vi.mock('./api/authApi.js', () => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  checkAvailability: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

import * as authApi from './api/authApi.js'

afterEach(cleanup)
beforeEach(() => {
  window.history.replaceState({}, '', '/')
  authApi.me.mockRejectedValue({ response: { status: 401 } })
})

describe('landing page', () => {
  it('shows the requested hero copy and routes every Get Started link to signup', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Organize Your Tasks. Achieve More.',
      }),
    ).toBeTruthy()

    const startLinks = screen.getAllByRole('link', { name: /get started/i })
    expect(startLinks.length).toBeGreaterThan(0)
    expect(
      startLinks.every((link) => link.getAttribute('href') === '/signup'),
    ).toBe(true)
  })

  it('shows a useful retry state when the API is not configured', async () => {
    window.history.replaceState({}, '', '/login')
    const error = new Error('API is not configured')
    error.code = 'API_NOT_CONFIGURED'
    authApi.me.mockRejectedValueOnce(error)

    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('This deployment is missing VITE_API_URL. Sign-in and data features are unavailable until it is configured and rebuilt.')
    expect(screen.getByLabelText(/username or email/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('keeps every in-page navigation link pointed at an existing section', () => {
    render(<App />)

    const sectionLinks = screen.getAllByRole('link').filter((link) =>
      link.getAttribute('href')?.startsWith('#'),
    )

    expect(sectionLinks.length).toBeGreaterThan(0)
    expect(
      sectionLinks.every((link) => document.querySelector(link.getAttribute('href'))),
    ).toBe(true)
  })

  it('presents the four requested features and three workflow steps', () => {
    render(<App />)

    for (const feature of [
      'Task Organization',
      'Progress Tracking',
      'Deadline Management',
      'Productivity Insights',
    ]) {
      expect(screen.getByRole('heading', { name: feature })).toBeTruthy()
    }

    for (const step of [
      'Create Your Tasks',
      'Organize Your Workflow',
      'Track Your Progress',
    ]) {
      expect(screen.getByRole('heading', { name: step })).toBeTruthy()
    }
  })

  it('opens the mobile navigation and closes it after choosing a section', async () => {
    const user = userEvent.setup()
    render(<App />)

    const menuButton = screen.getByRole('button', { name: 'Open menu' })
    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull()

    await user.click(menuButton)

    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Mobile navigation',
    })
    expect(menuButton.getAttribute('aria-expanded')).toBe('true')
    await user.click(within(mobileNavigation).getByRole('link', { name: 'Features' }))

    expect(menuButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull()
  })
})
