import { useState } from 'react'
import { LoaderCircle, Mail } from 'lucide-react'
import AppLink from '../components/AppLink.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import * as authApi from '../api/authApi.js'
import { normalizeApiError } from '../api/client.js'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      setMessage('')
      return
    }
    setSubmitting(true)
    setMessage('')
    setError('')
    try {
      const response = await authApi.forgotPassword({ email: normalizedEmail })
      setMessage(response.data.message || 'If the email address is registered, reset instructions will be sent if delivery is available.')
    } catch (requestError) {
      const result = normalizeApiError(requestError)
      setError(result.status === 0 ? 'Unable to reach the server. Check your connection and try again.' : result.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mt-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter the email address associated with your account.</p>
      </div>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {message ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">{message}</p> : null}
        <button type="submit" disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Sending request...</> : <><Mail size={16} aria-hidden="true" />Send reset instructions</>}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600"><AppLink to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">Back to log in</AppLink></p>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
