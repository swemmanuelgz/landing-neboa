import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './ReservasHoy.css'

const TURNO_LABELS = {
  mediodia: 'Mediodía',
  noche: 'Noche',
}

const turnoLabel = (turno) => TURNO_LABELS[turno] ?? (turno && turno !== 'N/A' ? turno : '—')

const estadoBadge = (estado) => {
  const map = {
    confirmada: { label: 'Confirmada', color: '#4caf50' },
    reservado: { label: 'Reservado', color: '#4caf50' },
    temporal: { label: 'Temporal', color: '#ff9800' },
    cancelada: { label: 'Cancelada', color: '#f44336' },
    cancelado: { label: 'Cancelada', color: '#f44336' },
    pasado: { label: 'Pasado', color: '#8d9e8d' },
    no_show: { label: 'No show', color: 'rgba(255,255,255,0.4)' },
  }
  return map[estado] ?? { label: estado ?? '—', color: '#c4b5a4' }
}

// La RPC trabaja en la zona horaria del restaurante (Europe/Madrid),
// así que el selector de fecha debe partir del "hoy" de Madrid.
const todayInMadrid = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())

const formatFechaLarga = (fecha) => {
  if (!fecha) return ''
  const d = new Date(`${fecha}T12:00:00`)
  if (Number.isNaN(d.getTime())) return fecha
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

const ReservasHoy = () => {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fecha, setFecha] = useState(todayInMadrid)
  const [soloActivas, setSoloActivas] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  // Los cambios de estado se disparan desde manejadores de eventos (no dentro del
  // efecto) para evitar renders en cascada; el efecto sólo consulta la RPC.
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data, error: rpcError } = await supabase.rpc('get_reservas_hoy', {
        p_fecha: fecha,
        p_solo_activas: soloActivas,
      })
      if (cancelled) return
      if (rpcError) {
        setError(rpcError.message ?? 'No se han podido cargar las reservas.')
        setReservas([])
      } else {
        setError('')
        setReservas(data ?? [])
      }
      setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fecha, soloActivas, reloadToken])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadToken(t => t + 1)
  }, [])

  const handleFechaChange = (value) => {
    setLoading(true)
    setFecha(value)
  }

  const handleToggleActivas = () => {
    setLoading(true)
    setSoloActivas(v => !v)
  }

  const totalComensales = reservas.reduce((sum, r) => sum + (r.invitados ?? 0), 0)
  const mediodia = reservas.filter(r => r.turno === 'mediodia')
  const noche = reservas.filter(r => r.turno === 'noche')
  const comensalesMediodia = mediodia.reduce((sum, r) => sum + (r.invitados ?? 0), 0)
  const comensalesNoche = noche.reduce((sum, r) => sum + (r.invitados ?? 0), 0)

  const hoy = todayInMadrid()
  const esHoy = fecha === hoy

  return (
    <div className="reservas-hoy">
      <div className="dash-page-header">
        <h1>Reservas de hoy</h1>
        <span className="dash-count">
          {formatFechaLarga(fecha)}{esHoy ? '' : ' (otra fecha)'}
        </span>
      </div>

      <div className="reservas-hoy-toolbar">
        <label className="dash-filter-label">
          Fecha
          <input
            type="date"
            className="dash-input"
            value={fecha}
            onChange={e => handleFechaChange(e.target.value || hoy)}
          />
        </label>
        <button
          type="button"
          className={`dash-btn-outline reservas-hoy-toggle${soloActivas ? '' : ' reservas-hoy-toggle--on'}`}
          onClick={handleToggleActivas}
          aria-pressed={!soloActivas}
        >
          {soloActivas ? 'Ver también canceladas' : 'Sólo activas'}
        </button>
        {!esHoy ? (
          <button type="button" className="dash-btn-outline" onClick={() => handleFechaChange(hoy)}>
            Volver a hoy
          </button>
        ) : null}
        <button
          type="button"
          className="dash-btn-outline reservas-hoy-reload"
          onClick={reload}
          disabled={loading}
        >
          {loading ? 'Cargando…' : '↻ Recargar'}
        </button>
      </div>

      <div className="reservas-hoy-kpis">
        <div className="reservas-hoy-kpi">
          <p className="reservas-hoy-kpi-label">Reservas</p>
          <p className="reservas-hoy-kpi-value">{reservas.length}</p>
        </div>
        <div className="reservas-hoy-kpi">
          <p className="reservas-hoy-kpi-label">Comensales</p>
          <p className="reservas-hoy-kpi-value reservas-hoy-kpi-value--accent">{totalComensales}</p>
        </div>
        <div className="reservas-hoy-kpi">
          <p className="reservas-hoy-kpi-label">Mediodía</p>
          <p className="reservas-hoy-kpi-value">{mediodia.length}</p>
          <p className="reservas-hoy-kpi-sub">{comensalesMediodia} comensales</p>
        </div>
        <div className="reservas-hoy-kpi">
          <p className="reservas-hoy-kpi-label">Noche</p>
          <p className="reservas-hoy-kpi-value">{noche.length}</p>
          <p className="reservas-hoy-kpi-sub">{comensalesNoche} comensales</p>
        </div>
      </div>

      {loading ? (
        <div className="dash-loading">Cargando reservas...</div>
      ) : error ? (
        <div className="reservas-hoy-error">
          <p>Error al cargar las reservas: {error}</p>
          <button type="button" className="dash-btn-outline" onClick={reload}>
            Reintentar
          </button>
        </div>
      ) : reservas.length === 0 ? (
        <div className="dash-empty">
          {esHoy ? 'No hay reservas para hoy' : 'No hay reservas para esta fecha'}
        </div>
      ) : (
        <div className="reservas-hoy-table-wrap">
          <table className="reservas-hoy-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Personas</th>
                <th>Turno</th>
                <th>Estado</th>
                <th>Recordatorio</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map(r => {
                const badge = estadoBadge(r.estado)
                return (
                  <tr key={r.id}>
                    <td data-label="Hora" className="reservas-hoy-hora">{r.hora?.slice(0, 5) ?? '—'}</td>
                    <td data-label="Nombre">{r.nombre || '—'}</td>
                    <td data-label="Teléfono">
                      {r.telefono ? (
                        <a className="reservas-hoy-tel" href={`tel:${r.telefono}`}>{r.telefono}</a>
                      ) : '—'}
                    </td>
                    <td data-label="Personas" style={{ textAlign: 'center' }}>{r.invitados ?? '—'}</td>
                    <td data-label="Turno">{turnoLabel(r.turno)}</td>
                    <td data-label="Estado">
                      <span
                        className="estado-badge"
                        style={{
                          background: badge.color + '22',
                          color: badge.color,
                          border: `1px solid ${badge.color}44`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td data-label="Recordatorio">
                      <span className={`recordatorio-badge ${r.recordatorio ? 'is-sent' : 'is-pending'}`}>
                        {r.recordatorio ? '✓ Enviado' : '· Pendiente'}
                      </span>
                    </td>
                    <td data-label="Notas" className="reservas-hoy-notas">{r.notas || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ReservasHoy
