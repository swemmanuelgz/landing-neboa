import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './Perfil.css'

export default function Perfil() {
  const { user } = useAuth()

  const [fullName, setFullName] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState(null)

  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        setFullName(data.full_name || '')
      }
      setProfileLoading(false)
    }
    fetchProfile()
  }, [user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)
    if (error) {
      setProfileMsg({ type: 'error', text: 'Error al guardar los cambios.' })
    } else {
      setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente.' })
    }
    setProfileSaving(false)
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPassMsg(null)

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    if (newPassword.length < 8) {
      setPassMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' })
      return
    }

    setPassLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPassMsg({ type: 'error', text: 'Contraseña actual incorrecta.' })
      setPassLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setPassMsg({ type: 'error', text: 'Error al actualizar la contraseña.' })
    } else {
      setPassMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }

    setPassLoading(false)
  }

  return (
    <div className="perfil-dash">
      <div className="dash-page-header">
        <h1>Mi perfil</h1>
      </div>

      <div className="perfil-card">
        <h2>Información personal</h2>
        {profileLoading ? (
          <div className="dash-loading">Cargando...</div>
        ) : (
          <form className="perfil-form" onSubmit={handleProfileSubmit}>
            <div className="perfil-field">
              <label className="perfil-label" htmlFor="perfil-email">Correo electrónico</label>
              <input
                id="perfil-email"
                className="dash-input perfil-input"
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
              />
            </div>

            <div className="perfil-field">
              <label className="perfil-label" htmlFor="perfil-fullname">Nombre completo</label>
              <input
                id="perfil-fullname"
                className="dash-input perfil-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="perfil-actions">
              <button
                type="submit"
                className="dash-btn-primary"
                disabled={profileSaving}
              >
                {profileSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {profileMsg && (
                <span className={`perfil-msg perfil-msg--${profileMsg.type}`}>
                  {profileMsg.text}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="perfil-card">
        <h2>Cambiar contraseña</h2>
        <form className="perfil-form" onSubmit={handlePasswordSubmit}>
          <div className="perfil-field">
            <label className="perfil-label" htmlFor="perfil-current-pass">Contraseña actual</label>
            <div className="perfil-input-wrap">
              <input
                id="perfil-current-pass"
                className="dash-input"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña actual"
                required
              />
              <button
                type="button"
                className="perfil-eye"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div className="perfil-field">
            <label className="perfil-label" htmlFor="perfil-new-pass">Nueva contraseña</label>
            <div className="perfil-input-wrap">
              <input
                id="perfil-new-pass"
                className="dash-input"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                required
              />
              <button
                type="button"
                className="perfil-eye"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div className="perfil-field">
            <label className="perfil-label" htmlFor="perfil-confirm-pass">Confirmar nueva contraseña</label>
            <div className="perfil-input-wrap">
              <input
                id="perfil-confirm-pass"
                className="dash-input"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                required
              />
              <button
                type="button"
                className="perfil-eye"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div className="perfil-actions">
            <button
              type="submit"
              className="dash-btn-primary"
              disabled={passLoading}
            >
              {passLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
            {passMsg && (
              <span className={`perfil-msg perfil-msg--${passMsg.type}`}>
                {passMsg.text}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
