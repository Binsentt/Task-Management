import { useState } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { normalizeApiError } from '../api/client.js'

function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    if (!identifier.trim() || !password) {
      setErrorMessage('Enter your username or email and password.')
      return
    }
    setSubmitting(true)
    setErrorMessage('')
    try {
      const user = await login({ identifier: identifier.trim().toLowerCase(), password })
      navigate(user.organization ? '/organization' : '/dashboard', { replace: true, state: location.state })
    } catch (error) {
      const result = normalizeApiError(error)
      setErrorMessage(result.status === 401 ? 'The username/email or password is incorrect.' : result.status === 0 ? 'Unable to reach the server. Check your connection and try again.' : result.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mt-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Log in to your account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Pick up where you left off.</p>
      </div>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-medium text-slate-700">Username or email</label>
          <input id="login-identifier" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className={inputClass} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-indigo-700 hover:text-indigo-800">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${inputClass} pr-12`} />
            <button type="button" aria-label={`${showPassword ? 'Hide' : 'Show'} password`} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-indigo-700">
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {errorMessage ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}
        <button type="submit" disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Logging in...</> : <><LockKeyhole size={16} aria-hidden="true" />Log in</>}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">
        Don’t have an account? <Link to="/signup" className="font-semibold text-indigo-700 hover:text-indigo-800">Create account</Link>
      </p>
    </AuthLayout>
  )
}

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'

export default LoginPage
