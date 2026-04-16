import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './ReservasDash.css'

const ESTADOS = ['todas', 'confirmada', 'temporal', 'cancelada', 'no_show']
const INITIAL_VISIBLE = 25
const TEST_PHONES = new Set(['+34632079379'])

const estadoBadge = (estado) => {
  const map = {
    confirmada: { label: 'Confirmada', color: '#4caf50' },
    temporal: { label: 'Temporal', color: '#ff9800' },
    cancelada: { label: 'Cancelada', color: '#f44336' },
    no_show: { label: 'No show', color: 'rgba(255,255,255,0.4)' },
  }
  return map[estado] ?? { label: estado, color: '#c4b5a4' }
}

const ReservasDash = () => {
  const { role } = useAuth()
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [filterEstado, setFilterEstado] = useState('todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const sentinelRef = useRef(null)

  const fetchReservas = async () => {
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .order('fecha')
      .order('hora')

    if (!error) setReservas(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchReservas()

    const channel = supabase
      .channel('reservas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, fetchReservas)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [filterDesde, filterHasta, filterEstado, searchQuery])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(c => Math.min(c + 25, filtered.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  })

  const handleCancelar = async (id) => {
    if (!window.confirm('¿Cancelar esta reserva?')) return
    await supabase.from('reservas').update({ estado: 'cancelada' }).eq('id', id)
  }

  const filtered = reservas.filter(r => {
    if (filterDesde && r.fecha < filterDesde) return false
    if (filterHasta && r.fecha > filterHasta) return false
    if (filterEstado !== 'todas' && r.estado !== filterEstado) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchNombre = (r.nombre ?? '').toLowerCase().includes(q)
      const matchTelefono = (r.telefono ?? '').toLowerCase().includes(q)
      const matchPersonas = String(r.invitados ?? '').includes(q)
      if (!matchNombre && !matchTelefono && !matchPersonas) return false
    }
    return true
  })

  const visibleItems = filtered.slice(0, visibleCount)

  const top3 = Object.values(
    filtered.reduce((acc, r) => {
      const key = r.telefono || 'Sin teléfono'
      if (TEST_PHONES.has(r.telefono)) return acc
      if (!acc[key]) acc[key] = { telefono: key, nombre: r.nombre || '', count: 0, invitados: 0 }
      acc[key].count += 1
      acc[key].invitados += r.invitados ?? 0
      return acc
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 3)

  const CROWNS = ['🥇', '🥈', '🥉']

  return (
    <div className="reservas-dash">
      <div className="dash-page-header">
        <h1>Reservas</h1>
        <span className="dash-count">{filtered.length} reservas</span>
      </div>

      <div className="reservas-search">
        <input
          type="search"
          className="dash-input reservas-search-input"
          placeholder="Buscar por nombre, teléfono o personas..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="dash-btn-outline" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      <div className="reservas-filters">
        <input
          type="date"
          value={filterDesde}
          onChange={e => setFilterDesde(e.target.value)}
          className="dash-input"
          title="Desde"
        />
        <input
          type="date"
          value={filterHasta}
          onChange={e => setFilterHasta(e.target.value)}
          className="dash-input"
          title="Hasta"
        />
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="dash-select"
        >
          {ESTADOS.map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
        {(filterDesde || filterHasta || filterEstado !== 'todas' || searchQuery) ? (
          <button
            className="dash-btn-outline"
            onClick={() => { setFilterDesde(''); setFilterHasta(''); setFilterEstado('todas'); setSearchQuery('') }}
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {!loading && filtered.length > 0 && top3.length > 0 ? (
        <div className="top3-section">
          <h3>Top clientes</h3>
          <div className="top3-cards">
            {top3.map((client, i) => (
              <div key={client.telefono} className="top3-card">
                <p className="top3-phone">{CROWNS[i]} {client.telefono}</p>
                {client.nombre ? <p className="top3-name">{client.nombre}</p> : null}
                <p className="top3-stats">{client.count} reservas · {client.invitados} personas</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="dash-loading">Cargando reservas...</div>
      ) : filtered.length === 0 ? (
        <div className="dash-empty">No hay reservas con estos filtros</div>
      ) : (
        <div className="reservas-table-wrap">
          <table className="reservas-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Personas</th>
                <th>Estado</th>
                <th>Notas</th>
                {role !== 'worker' ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(r => {
                const badge = estadoBadge(r.estado)
                return (
                  <tr key={r.id}>
                    <td>{r.fecha}</td>
                    <td>{r.hora?.slice(0, 5)}</td>
                    <td>{r.nombre}</td>
                    <td>{r.telefono}</td>
                    <td style={{ textAlign: 'center' }}>{r.invitados}</td>
                    <td>
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
                    <td className="notas-cell">{r.notas || '—'}</td>
                    {role !== 'worker' ? (
                      <td>
                        {r.estado !== 'cancelada' ? (
                          <button
                            className="dash-btn-danger"
                            onClick={() => handleCancelar(r.id)}
                          >
                            Cancelar
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div ref={sentinelRef} style={{ height: 1 }} />
          {visibleCount < filtered.length && (
            <div style={{ textAlign: 'center', padding: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
              Mostrando {visibleCount} de {filtered.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReservasDash
