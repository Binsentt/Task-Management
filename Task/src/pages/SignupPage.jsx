import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppLink from '../components/AppLink.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { getPasswordStrength, sanitizeFieldValue, validateSignupField } from '../auth/validation.js'
import { normalizeApiError } from '../api/client.js'
import * as authApi from '../api/authApi.js'

const initialValues = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  contact_number: '',
  account_type: 'individual',
  organization_name: '',
}

function destinationFor(user) {
  return user.organization ? '/organization' : '/dashboard'
}

function SignupPage() {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [availability, setAvailability] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()
  const strength = useMemo(() => getPasswordStrength(values.password), [values.password])

  useEffect(() => {
    let active = true
    const timers = []
    for (const field of ['username', 'email']) {
      if (submitting || !touched[field] || validateSignupField(field, values[field])) continue
      const value = field === 'email' ? values.email.trim().toLowerCase() : values.username.trim().toLowerCase()
      timers.push(window.setTimeout(async () => {
        try {
          const response = await authApi.checkAvailability({ [field]: value })
          if (active) {
            setAvailability((current) => ({
              ...current,
              [field]: response.data.data.available ? true : `This ${field} is already in use`,
            }))
          }
        } catch {
          if (active) {
            setAvailability((current) => ({
              ...current,
              [field]: 'Availability could not be checked. We will verify it when you submit.',
            }))
          }
        }
      }, 450))
    }
    return () => {
      active = false
      timers.forEach(window.clearTimeout)
    }
  }, [submitting, touched.email, touched.username, values.email, values.username])

  function updateField(field, rawValue) {
    const value = ['full_name', 'contact_number'].includes(field)
      ? sanitizeFieldValue(field, rawValue)
      : rawValue
    setValues((current) => ({ ...current, [field]: value }))
    setTouched((current) => ({ ...current, [field]: true }))
    setAvailability((current) => ({ ...current, [field]: undefined }))
    setServerErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    setFormError('')
  }

  function fieldError(field) {
    const validation = validateSignupField(field, values[field], values)
    const message = field === 'password' && /72 UTF-8 bytes/i.test(validation)
      ? 'Password is too long'
      : validation
    return touched[field]
      ? serverErrors[field] || message || (typeof availability[field] === 'string' ? availability[field] : '')
      : ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const allTouched = Object.fromEntries(Object.keys(values).map((field) => [field, true]))
    setTouched(allTouched)
    const fieldsToCheck = [
      'full_name', 'username', 'email', 'password', 'confirmPassword', 'contact_number',
      ...(values.account_type === 'organization' ? ['organization_name'] : []),
    ]
    const firstError = fieldsToCheck.some((field) => {
      if (field === 'organization_name') {
        return values.organization_name.trim().length < 2 || values.organization_name.trim().length > 60
      }
      return Boolean(validateSignupField(field, values[field], values))
    })
    if (firstError) return

    setSubmitting(true)
    setFormError('')
    setServerErrors({})
    try {
      const { organization_name, ...individualValues } = values
      const user = await register({
        ...individualValues,
        username: values.username.trim().toLowerCase(),
        email: values.email.trim().toLowerCase(),
        full_name: values.full_name.trim(),
        ...(values.account_type === 'organization'
          ? { organization_name: organization_name.trim() }
          : {}),
      })
      navigate(destinationFor(user), { replace: true })
    } catch (error) {
      const { message, errors = [] } = normalizeApiError(error)
      const fieldNames = [
        'full_name',
        'username',
        'email',
        'password',
        'confirmPassword',
        'contact_number',
        'organization_name',
      ]
      const nextServerErrors = {}
      const unassignedErrors = []
      for (const validationError of errors) {
        if (fieldNames.includes(validationError.field)) {
          nextServerErrors[validationError.field] = nextServerErrors[validationError.field]
            ? `${nextServerErrors[validationError.field]} ${validationError.message}`
            : validationError.message
        } else if (validationError.message) {
          unassignedErrors.push(validationError.message)
        }
      }
      if (Object.keys(nextServerErrors).length) {
        setServerErrors(nextServerErrors)
        setTouched((current) => ({
          ...current,
          ...Object.fromEntries(Object.keys(nextServerErrors).map((field) => [field, true])),
        }))
      }
      if (/username/i.test(message) && /taken|already|exist/i.test(message)) {
        setAvailability((current) => ({ ...current, username: message }))
        setTouched((current) => ({ ...current, username: true }))
      } else if (/email/i.test(message) && /taken|already|registered|exist/i.test(message)) {
        setAvailability((current) => ({ ...current, email: message }))
        setTouched((current) => ({ ...current, email: true }))
      } else if (unassignedErrors.length) {
        setFormError(unassignedErrors.join(' '))
      } else if (!Object.keys(nextServerErrors).length) {
        setFormError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const passwordError = fieldError('password')
  const confirmationError = fieldError('confirmPassword')
  const strengthColor = strength.label === 'Strong' ? 'text-emerald-600' : strength.label === 'Medium' ? 'text-amber-600' : 'text-rose-600'

  return (
    <AuthLayout>
      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Get started</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Set up your workspace and start making progress.</p>
      </div>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Full name" error={fieldError('full_name')}>
            <input id="full-name" autoComplete="name" value={values.full_name} onChange={(event) => updateField('full_name', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, full_name: true }))} className={inputClass(fieldError('full_name'))} />
          </Field>
          <Field label="Username" error={fieldError('username')} hint={availability.username === true && touched.username && !validateSignupField('username', values.username) ? 'Username is available' : ''}>
            <input id="username" autoComplete="username" value={values.username} onChange={(event) => updateField('username', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, username: true }))} className={inputClass(fieldError('username'))} />
          </Field>
          <Field label="Email" error={fieldError('email')} hint={availability.email === true && touched.email && !validateSignupField('email', values.email) ? 'Email is available' : ''}>
            <input id="email" type="email" autoComplete="email" value={values.email} onChange={(event) => updateField('email', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} className={inputClass(fieldError('email'))} />
          </Field>
          <Field label="Contact number" error={fieldError('contact_number')}>
            <input id="contact-number" type="text" inputMode="numeric" autoComplete="tel" maxLength={20} value={values.contact_number} onChange={(event) => updateField('contact_number', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, contact_number: true }))} className={inputClass(fieldError('contact_number'))} />
          </Field>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Password" error={passwordError}>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={(event) => updateField('password', event.target.value)} onFocus={() => setPasswordFocused(true)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} className={`${inputClass(passwordError)} pr-11`} />
              <VisibilityButton visible={showPassword} onClick={() => setShowPassword((visible) => !visible)} label="password" />
            </div>
          </Field>
          <Field label="Re-enter password" error={confirmationError}>
            <div className="relative">
              <input id="re-enter-password" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))} className={`${inputClass(confirmationError)} pr-11`} />
              <VisibilityButton visible={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)} label="confirmation" />
            </div>
          </Field>
        </div>

        {passwordFocused || values.password ? (
          <div aria-live="polite" className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Password requirements</p>
              <p className={`text-xs font-semibold ${strengthColor}`}>{strength.label}</p>
            </div>
            <ul className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
              {strength.rules
                .filter(({ label }) => label !== 'At most 72 UTF-8 bytes')
                .map(({ label, passed }) => (
                  <li key={label} className={`flex items-center gap-2 ${passed ? 'text-indigo-700' : 'text-slate-500'}`}>
                    <Check size={14} className={passed ? 'opacity-100' : 'opacity-35'} aria-hidden="true" />
                    {label}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Account type</legend>
          <div className="grid gap-2 min-[360px]:grid-cols-2 min-[360px]:gap-3">
            {[
              ['individual', 'Individual'],
              ['organization', 'Organization'],
            ].map(([value, label]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${values.account_type === value ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                <input type="radio" name="account_type" value={value} checked={values.account_type === value} onChange={() => updateField('account_type', value)} className="accent-indigo-600" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {values.account_type === 'organization' ? (
          <Field label="Organization name" error={touched.organization_name && values.organization_name.trim().length < 2 ? 'Organization name must be at least 2 characters' : touched.organization_name && values.organization_name.trim().length > 60 ? 'Organization name must be at most 60 characters' : ''}>
            <input id="organization-name" value={values.organization_name} onChange={(event) => updateField('organization_name', event.target.value)} onBlur={() => setTouched((current) => ({ ...current, organization_name: true }))} className={inputClass('')} maxLength={60} />
          </Field>
        ) : null}

        {formError ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p> : null}
        <button type="submit" disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <><LoaderCircle className="animate-spin" size={17} aria-hidden="true" />Creating account...</> : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <AppLink to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">Log in</AppLink>
      </p>
    </AuthLayout>
  )
}

function Field({ label, error, hint, children }) {
  const id = label.toLowerCase().replaceAll(' ', '-')
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children && typeof children === 'object'
        ? <div className="[&_input]:w-full" data-field={id}>{children}</div>
        : null}
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-emerald-700">{hint}</p> : null}
    </div>
  )
}

function inputClass(error) {
  return `h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'}`
}

function VisibilityButton({ visible, onClick, label }) {
  const Icon = visible ? EyeOff : Eye
  return (
    <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label}`} onClick={onClick} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-indigo-700">
      <Icon size={17} aria-hidden="true" />
    </button>
  )
}

export default SignupPage
