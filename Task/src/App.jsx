import { lazy, Suspense } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

// The login owner supplies the authenticated user after verifying the session.
// No browser storage or query parameter is treated as authentication.
const DevelopmentDashboard = import.meta.env.DEV
  ? lazy(() => import('./pages/DashboardDevelopmentPreview.jsx'))
  : null

function App({ authenticatedUser = null, dashboardProps = {} }) {
  if (authenticatedUser && window.location.pathname === '/dashboard') {
    return <DashboardPage {...dashboardProps} user={authenticatedUser} />
  }

  if (DevelopmentDashboard && new URLSearchParams(window.location.search).get('preview') === 'dashboard') {
    return (
      <Suspense fallback={<p className="p-8 text-slate-500">Loading preview…</p>}>
        <DevelopmentDashboard />
      </Suspense>
    )
  }

  return <LandingPage />
}

export default App
