import LandingPage from './pages/LandingPage.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'

function App() {
  return (
    <AuthProvider>
      <LandingPage />
    </AuthProvider>
  )
}

export default App
