import { describe, expect, it } from 'vitest'
import { deadlineFieldsToIso, deadlineToLocalFields, localDateKey } from './taskDates.js'

describe('task deadline helpers', () => {
  it('represents an omitted deadline as null and rejects a partial date/time pair', () => {
    expect(deadlineFieldsToIso('', '')).toEqual({ deadline: null, error: '' })
    expect(deadlineFieldsToIso('2026-10-14', '')).toEqual({
      deadline: null,
      error: 'Choose both a deadline date and time, or leave both blank.',
    })
    expect(deadlineFieldsToIso('', '09:30')).toEqual({
      deadline: null,
      error: 'Choose both a deadline date and time, or leave both blank.',
    })
  })

  it('preserves the selected local wall time through serialization and edit prefill', () => {
    const result = deadlineFieldsToIso('2026-10-14', '09:30')

    expect(result.error).toBe('')
    expect(new Date(result.deadline).toISOString()).toBe(result.deadline)
    expect(deadlineToLocalFields(result.deadline)).toEqual({
      date: '2026-10-14',
      time: '09:30',
    })
  })

  it('rejects impossible calendar dates and clock times', () => {
    expect(deadlineFieldsToIso('2026-02-30', '10:00')).toEqual({
      deadline: null,
      error: 'Enter a valid deadline date and time.',
    })
    expect(deadlineFieldsToIso('2026-10-14', '25:90')).toEqual({
      deadline: null,
      error: 'Enter a valid deadline date and time.',
    })
    expect(deadlineFieldsToIso('2026-2-03', '10:00')).toEqual({
      deadline: null,
      error: 'Enter a valid deadline date and time.',
    })
  })

  it('rejects a nonexistent local time at the spring daylight-saving transition', () => {
    const originalTimezone = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      expect(deadlineFieldsToIso('2026-03-08', '02:30')).toEqual({
        deadline: null,
        error: 'Enter a valid deadline date and time.',
      })
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimezone
    }
  })

  it('formats local calendar dates as zero-padded keys', () => {
    const date = new Date(2026, 9, 4, 23, 45)

    expect(localDateKey(date)).toBe('2026-10-04')
  })
})
