import { useState } from 'react'
import { Check, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { getPasswordStrength, validateSignupField } from '../auth/validation.js'
import * as authApi from '../api/authApi.js'
import { normalizeApiError } from '../api/client.js'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const strength = getPasswordStrength(password)
  const passwordError = touched.password ? validateSignupField('password', password) : ''
  const confirmationError = touched.confirmation
    ? validateSignupField('confirmPassword', confirmation, { password })
    : ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setTouched({ password: true, confirmation: true })
    if (!token) {
      setError('This reset link is missing its token. Request a new password reset link.')
      return
    }
    if (validateSignupField('password', password) || validateSignupField('confirmPassword', confirmation, { password })) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const response = await authApi.resetPassword({ token, password, confirmPassword: confirmation })
      setMessage(response.data.message || 'Password changed. Please log in.')
      window.setTimeout(() => navigate('/login', { replace: true }), 900)
    } catch (requestError) {
      const result = normalizeApiError(requestError)
      setError(result.status === 0 ? 'Unable to reach the server. Check your connection and try again.' : result.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout backTo="/forgot-password" backLabel="Request another link">
      <div className="mt-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Secure your account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Use a strong password you have not used before.</p>
      </div>
      {!token ? <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">This reset link is missing its token. Request a new link to continue.</p> : null}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="reset-password" className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
          <div className="relative">
            <input id="reset-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setTouched((current) => ({ ...current, password: true })) }} onBlur={() => setTouched((current) => ({ ...current, password: true }))} className={`${inputClass(passwordError)} pr-12`} />
            <VisibilityButton visible={showPassword} onClick={() => setShowPassword((value) => !value)} label="new password" />
          </div>
          {passwordError ? <p className="mt-1.5 text-xs text-rose-600">{passwordError}</p> : null}
        </div>
        <div>
          <label htmlFor="reset-confirmation" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</label>
          <div className="relative">
            <input id="reset-confirmation" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setTouched((current) => ({ ...current, confirmation: true })) }} onBlur={() => setTouched((current) => ({ ...current, confirmation: true }))} className={`${inputClass(confirmationError)} pr-12`} />
            <VisibilityButton visible={showConfirmation} onClick={() => setShowConfirmation((value) => !value)} label="confirmation" />
          </div>
          {confirmationError ? <p className="mt-1.5 text-xs text-rose-600">{confirmationError}</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Password requirements</span>
            <span className={strength.label === 'Strong' ? 'text-emerald-600' : strength.label === 'Medium' ? 'text-amber-600' : 'text-rose-600'}>{strength.label}</span>
          </div>
          <ul className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
            {strength.rules.map(({ label, passed }) => <li key={label} className={`flex items-center gap-2 ${passed ? 'text-emerald-700' : ''}`}><Check size={14} className={passed ? '' : 'opacity-25'} aria-hidden="true" />{label}</li>)}
          </ul>
        </div>
        {error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {message ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
        <button type="submit" disabled={submitting || !token} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Saving password...</> : 'Save new password'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Remembered your password? <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">Log in</Link></p>
    </AuthLayout>
  )
}

function VisibilityButton({ visible, onClick, label }) {
  const Icon = visible ? EyeOff : Eye
  return <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label}`} onClick={onClick} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-indigo-700"><Icon size={17} aria-hidden="true" /></button>
}

const inputClass = (error) => `h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition focus:ring-4 ${error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'}`

export default ResetPasswordPage
