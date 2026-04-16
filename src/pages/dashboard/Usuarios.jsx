import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './Usuarios.css'

const Usuarios = () => {
  const { role, user: currentUser, session } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('worker')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)

  const fetchUsuarios = async () => {
    const { data } = await supabase.rpc('get_profiles_with_status')
    setUsuarios(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (role === 'worker') return
    fetchUsuarios()
  }, [role])

  const handleRoleChange = async (id, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u))
  }

  const handleDelete = async (id, email, isConfirmed) => {
    const msg = isConfirmed
      ? `¿Eliminar el usuario ${email}?`
      : `El usuario ${email} aún no ha aceptado la invitación. ¿Eliminar igualmente?`
    if (!window.confirm(msg)) return
    await supabase.from('profiles').delete().eq('id', id)
    setUsuarios(prev => prev.filter(u => u.id !== id))
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMsg(null)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: inviteEmail,
            full_name: inviteName,
            role: inviteRole,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
      setInviteMsg({ type: 'success', text: `Invitación enviada a ${inviteEmail}` })
      setInviteEmail('')
      setInviteName('')
      setInviteRole('worker')
      fetchUsuarios()
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.message })
    } finally {
      setInviteLoading(false)
    }
  }

  if (role === 'worker') {
    return (
      <div className="usuarios-dash">
        <div className="dash-page-header"><h1>Usuarios</h1></div>
        <div className="dash-empty">No tienes permisos para ver esta sección.</div>
      </div>
    )
  }

  return (
    <div className="usuarios-dash">
      <div className="dash-page-header">
        <h1>Usuarios</h1>
        <span className="dash-count">{usuarios.length} usuarios</span>
      </div>

      {loading ? (
        <div className="dash-loading">Cargando usuarios...</div>
      ) : (
        <div className="usuarios-table-wrap">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Alta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={u.id === currentUser?.id ? 'current-user-row' : ''}>
                  <td>{u.email}</td>
                  <td>{u.full_name || '—'}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="dash-select"
                      disabled={u.id === currentUser?.id}
                    >
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                      {role === 'developer' ? <option value="developer">Developer</option> : null}
                    </select>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
                  <td>
                    {u.email_confirmed_at ? (
                      <span className="user-status-badge user-status-badge--activo">Activo</span>
                    ) : (
                      <span className="user-status-badge user-status-badge--pendiente">Pendiente</span>
                    )}
                  </td>
                  <td>
                    {u.id !== currentUser?.id ? (
                      <button
                        className="dash-btn-danger"
                        onClick={() => handleDelete(u.id, u.email, !!u.email_confirmed_at)}
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="invite-section">
        <h2>Invitar trabajador</h2>
        <p className="invite-desc">
          Se enviará un email con un enlace para que el usuario cree su cuenta.
        </p>
        <form onSubmit={handleInvite} className="invite-form">
          <input
            type="email"
            placeholder="Email del trabajador"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            className="dash-input"
          />
          <input
            type="text"
            placeholder="Nombre completo (opcional)"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            className="dash-input"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="dash-select"
          >
            <option value="worker">Worker</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="dash-btn-primary" disabled={inviteLoading}>
            {inviteLoading ? 'Enviando...' : 'Enviar invitación'}
          </button>
        </form>
        {inviteMsg ? (
          <p className={`invite-msg invite-msg--${inviteMsg.type}`}>{inviteMsg.text}</p>
        ) : null}
      </div>
    </div>
  )
}

export default Usuarios
