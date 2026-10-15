import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import DashboardOverviewPage from './pages/DashboardOverviewPage.jsx'
import DashboardTasksPage from './pages/DashboardTasksPage.jsx'
import DashboardCalendarPage from './pages/DashboardCalendarPage.jsx'
import DashboardReportPage from './pages/DashboardReportPage.jsx'

function dashboardPath(user) {
  return user?.organization ? '/organization' : '/dashboard'
}

function AuthPage({ children }) {
  const { user, status, sessionError, refreshSession } = useAuth()
  const location = useLocation()

  if (user) return <Navigate to={dashboardPath(user)} replace state={{ from: location }} />
  return (
    <>
      {status === 'error' ? (
        <div role="alert" className="flex flex-col justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-sm font-semibold">We couldn't check your session</p>
            <p className="mt-0.5 text-sm">{sessionError || 'Check your connection and try again.'}</p>
          </div>
          <button
            className="min-h-10 self-start rounded-lg border border-amber-300 bg-white px-3.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 sm:self-auto"
            onClick={refreshSession}
          >
            Try again
          </button>
        </div>
      ) : null}
      {children}
    </>
  )
}

function ProtectedDashboard({ scope }) {
  const { user, status, sessionError, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageMessage title="Restoring your session..." />
  if (status === 'error') {
    return (
      <PageMessage
        title="We couldn't restore your session"
        detail={sessionError || 'Check your connection and try again.'}
        action={refreshSession}
      />
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (scope === 'organization' && !user.organization) return <Navigate to="/dashboard" replace />
  if (scope === 'personal' && user.organization) return <Navigate to="/organization" replace />
  return <Outlet />
}

function PageMessage({ title, detail, action }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {detail ? <p className="mt-3 text-sm text-slate-600">{detail}</p> : null}
        {action ? (
          <button className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white" onClick={action}>
            Try again
          </button>
        ) : null}
      </section>
    </main>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<AuthPage><SignupPage /></AuthPage>} />
      <Route path="/login" element={<AuthPage><LoginPage /></AuthPage>} />
      <Route path="/forgot-password" element={<AuthPage><ForgotPasswordPage /></AuthPage>} />
      <Route path="/reset-password" element={<AuthPage><ResetPasswordPage /></AuthPage>} />
      <Route element={<ProtectedDashboard scope="personal" />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="tasks" element={<DashboardTasksPage />} />
          <Route path="calendar" element={<DashboardCalendarPage />} />
          <Route path="report" element={<DashboardReportPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedDashboard scope="organization" />}>
        <Route path="/organization" element={<DashboardLayout scope="organization" />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="tasks" element={<DashboardTasksPage />} />
          <Route path="calendar" element={<DashboardCalendarPage />} />
          <Route path="report" element={<DashboardReportPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
