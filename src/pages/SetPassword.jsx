import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../img/logo_neboa.jpg'
import './Login.css'

const SetPassword = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase processes the hash tokens and fires onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionReady(true)
    })
    // Also check if session already established
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    // Fallback: if no session materialises within 8s (link already consumed,
    // user pasted a bare /set-password URL, etc.), bounce to /login so the user
    // isn't stuck on the "Verificando..." screen forever.
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) navigate('/login', { replace: true })
        return prev
      })
    }, 8000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Error al establecer la contraseña. Inténtalo de nuevo.')
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  const EyeIcon = ({ open }) => open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  if (!sessionReady) {
    return (
      <div className="login-page">
        <div className="login-card">
          <img src={logo} alt="Néboa Restaurante" className="login-logo" />
          <p style={{ color: '#c4b5a4', fontSize: '0.9rem' }}>Verificando enlace de invitación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="Néboa Restaurante" className="login-logo" />
        <h1 className="login-title">Bienvenido al equipo</h1>
        <p className="login-subtitle">Establece tu contraseña para acceder</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="sp-password">Nueva contraseña</label>
            <div className="login-password-wrap">
              <input
                id="sp-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
              <button type="button" className="login-eye-btn" onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="sp-confirm">Confirmar contraseña</label>
            <div className="login-password-wrap">
              <input
                id="sp-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repite la contraseña"
              />
              <button type="button" className="login-eye-btn" onClick={() => setShowConfirm(p => !p)}
                aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>
          {error ? <p className="login-error" role="alert">{error}</p> : null}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SetPassword
