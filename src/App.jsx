import LandingPage from './pages/LandingPage'
import { Navigate, Route, Routes } from 'react-router-dom'
import './styles/variables.css'

// Solo queda la landing pública. El antiguo /login + /dashboard (Supabase viejo) se retiró:
// el personal usa el panel /app de nexum-restaurant. Las rutas viejas vuelven a la portada.
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
