import { describe, expect, it } from 'vitest'
import {
  getPasswordStrength,
  sanitizeFieldValue,
  validateSignupField,
} from './validation.js'

describe('signup input validation', () => {
  it('filters names and pasted contact numbers without losing leading zeroes', () => {
    expect(sanitizeFieldValue('full_name', 'Zoë 2! Smith')).toBe('Zoë Smith')
    expect(sanitizeFieldValue('full_name', 'Jose\u0301 Smith')).toBe('Jose\u0301 Smith')
    expect(validateSignupField('full_name', 'Jose\u0301 Smith')).toBe('')
    expect(sanitizeFieldValue('contact_number', '0012x-34')).toBe('001234')
  })

  it('validates Gmail address and backend username format', () => {
    expect(validateSignupField('email', '  USER.Name@GMAIL.COM ')).toBe('')
    expect(validateSignupField('email', 'user@gmail.com.evil')).toMatch(/gmail\.com/i)
    expect(validateSignupField('username', 'valid_user.2')).toBe('')
    expect(validateSignupField('username', 'bad name')).toMatch(/letters, numbers/i)
  })

  it('checks every password requirement and bcrypt UTF-8 byte length', () => {
    expect(getPasswordStrength('StrongPass1!').label).toBe('Strong')
    expect(getPasswordStrength('weak').rules.every((rule) => !rule.passed)).toBe(false)
    const oversized = `Aa1!${'😊'.repeat(18)}`
    expect(new TextEncoder().encode(oversized).length).toBeGreaterThan(72)
    expect(validateSignupField('password', oversized)).toMatch(/72 UTF-8 bytes/i)
  })

  it('validates matching password confirmation after a password is entered', () => {
    expect(validateSignupField('confirmPassword', 'StrongPass1!', {
      password: 'StrongPass1!',
    })).toBe('')
    expect(validateSignupField('confirmPassword', 'Different1!', {
      password: 'StrongPass1!',
    })).toMatch(/do not match/i)
  })
})
