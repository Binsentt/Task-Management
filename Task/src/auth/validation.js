const usernamePattern = /^[a-z0-9_.-]{4,30}$/i
const gmailPattern = /^[^\s@]+@gmail\.com$/i

export function sanitizeFieldValue(field, value) {
  if (field === 'full_name') {
    return value.replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ')
  }
  if (field === 'contact_number') {
    return value.replace(/\D/g, '').slice(0, 20)
  }
  return value
}

export function getPasswordStrength(password) {
  const bytes = new TextEncoder().encode(password).length
  const rules = [
    { label: 'At least 8 characters', passed: Array.from(password).length >= 8 },
    { label: 'An uppercase letter', passed: /\p{Lu}/u.test(password) },
    { label: 'A lowercase letter', passed: /\p{Ll}/u.test(password) },
    { label: 'A number', passed: /\p{N}/u.test(password) },
    { label: 'A symbol', passed: /[^\p{L}\p{N}]/u.test(password) },
    { label: 'At most 72 UTF-8 bytes', passed: bytes <= 72 },
  ]
  const score = rules.filter((rule) => rule.passed).length
  const label = score === rules.length ? 'Strong' : score >= 3 ? 'Medium' : 'Weak'
  return { label, score, rules }
}

export function validateSignupField(field, value, values = {}) {
  const text = typeof value === 'string' ? value : ''
  switch (field) {
    case 'full_name':
      if (!text.trim()) return 'Full name is required'
      return /^(?:\p{L}\p{M}*)+(?: (?:\p{L}\p{M}*)+)*$/u.test(text.trim())
        ? ''
        : 'Use letters and spaces only'
    case 'username':
      if (!text.trim()) return 'Username is required'
      return usernamePattern.test(text.trim())
        ? ''
        : 'Use 4–30 letters, numbers, underscores, periods, or hyphens'
    case 'email':
      if (!text.trim()) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) return 'Enter a valid email address'
      return gmailPattern.test(text.trim()) ? '' : 'Email must end in @gmail.com'
    case 'password': {
      if (!text) return 'Password is required'
      const strength = getPasswordStrength(text)
      if (!strength.rules[0].passed) return 'Password must be at least 8 characters'
      const unmet = strength.rules.slice(1, 5).filter((rule) => !rule.passed)
      if (unmet.length) return 'Password must include uppercase, lowercase, a number, and a symbol'
      return strength.rules[5].passed ? '' : 'Password must not exceed 72 UTF-8 bytes'
    }
    case 'confirmPassword':
      if (!text) return 'Please re-enter your password'
      return text === values.password ? '' : 'Passwords do not match'
    case 'contact_number':
      if (!text) return 'Contact number is required'
      return /^[0-9]{1,20}$/.test(text) ? '' : 'Use 1–20 digits only'
    default:
      return ''
  }
}
