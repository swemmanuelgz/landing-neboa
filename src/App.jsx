import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import './styles/variables.css'

const Login = lazy(() => import('./pages/Login'))
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const ReservasDash = lazy(() => import('./pages/dashboard/ReservasDash'))
const Estadisticas = lazy(() => import('./pages/dashboard/Estadisticas'))
const Usuarios = lazy(() => import('./pages/dashboard/Usuarios'))
const Llamadas = lazy(() => import('./pages/dashboard/Llamadas'))
const Perfil = lazy(() => import('./pages/dashboard/Perfil'))
const Horarios = lazy(() => import('./pages/dashboard/Horarios'))

function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#2a2a2a' }} />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<ReservasDash />} />
            <Route path="reservas" element={<ReservasDash />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="llamadas" element={<Llamadas />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="horarios" element={<Horarios />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
