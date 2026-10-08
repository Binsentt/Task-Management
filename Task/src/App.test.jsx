import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.jsx'

afterEach(cleanup)

describe('landing page', () => {
  it('shows the requested hero copy and links to the start section', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Organize Your Tasks. Achieve More.',
      }),
    ).toBeTruthy()

    const startLinks = screen.getAllByRole('link', { name: /get started/i })
    expect(startLinks.length).toBeGreaterThan(0)
    expect(
      startLinks.every((link) => {
        const target = link.getAttribute('href')
        return target?.startsWith('#') && document.querySelector(target)
      }),
    ).toBe(true)
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
