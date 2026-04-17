import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import './Llamadas.css'

const PAGE_SIZE = 20

function formatDuracion(minutos) {
  if (minutos == null) return '—'
  const m = Math.floor(minutos)
  const s = Math.round((minutos - m) * 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatCoste(coste) {
  if (coste == null) return '—'
  return `€${Number(coste).toFixed(2)}`
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

function formatHora(hora) {
  if (!hora) return '—'
  return hora.slice(0, 5)
}

const MOTIVO_MAP = {
  'customer-ended-call': { corto: 'Cliente colgó', largo: 'El cliente finalizó la llamada', tipo: 'cliente' },
  'assistant-forwarded-call': { corto: 'Redirigida', largo: 'El asistente redirigió la llamada', tipo: 'redirigida' },
  'assistant-ended-call': { corto: 'Asistente finalizó', largo: 'El asistente finalizó la llamada', tipo: 'asistente' },
  'silence-timed-out': { corto: 'Silencio', largo: 'Tiempo de silencio agotado', tipo: 'silencio' },
  'customer-ended-call-before-warm-transfer': { corto: 'Colgó antes de transferir', largo: 'El cliente colgó antes de ser transferido', tipo: 'cliente' },
  'call.in-progress.error-transfer-failed': { corto: 'Error transferencia', largo: 'Error al intentar transferir la llamada', tipo: 'error' },
  'call.in-progress.twilio-completed-call': { corto: 'Completada', largo: 'Llamada completada por el sistema', tipo: 'otros' },
  'twilio-reported-customer-misdialed': { corto: 'Número equivocado', largo: 'El cliente marcó un número equivocado', tipo: 'otros' },
  'exceeded-max-duration': { corto: 'Duración máx.', largo: 'Se superó la duración máxima de la llamada', tipo: 'error' },
  'call.in-progress.error-providerfault-transport-never-connected': { corto: 'Sin conexión', largo: 'Error de conexión del proveedor', tipo: 'error' },
  'call.in-progress.error-assistant-did-not-receive-customer-audio': { corto: 'Sin audio', largo: 'El asistente no recibió audio del cliente', tipo: 'error' },
  'call.in-progress.error-providerfault-google-llm-failed': { corto: 'Error LLM', largo: 'Error en el proveedor de IA', tipo: 'error' },
}

function traducirMotivo(motivo) {
  if (!motivo) return { corto: '—', largo: 'Sin motivo registrado', tipo: 'otros' }
  if (MOTIVO_MAP[motivo]) return MOTIVO_MAP[motivo]
  if (motivo.startsWith('call.in-progress.error') || motivo === 'exceeded-max-duration') {
    return { corto: 'Error', largo: motivo, tipo: 'error' }
  }
  return { corto: motivo, largo: motivo, tipo: 'otros' }
}

function MotivoBadge({ motivo }) {
  const { corto, tipo } = traducirMotivo(motivo)
  return (
    <span className={`motivo-badge motivo-badge--${tipo}`}>{corto}</span>
  )
}

function LlamadaModal({ llamada, onClose }) {
  if (!llamada) return null
  const { largo, tipo } = traducirMotivo(llamada.motivo_finalizacion)

  return (
    <div className="llamadas-modal-overlay" onClick={onClose}>
      <div className="llamadas-modal" onClick={(e) => e.stopPropagation()}>
        <button className="llamadas-modal-close" onClick={onClose}>×</button>
        <div className="llamadas-modal-header">
          <span className="llamadas-modal-telefono">{llamada.telefono ?? '—'}</span>
        </div>
        <div className="llamadas-modal-body">
          <div className="llamadas-modal-field">
            <span className="llamadas-modal-label">Fecha</span>
            <span className="llamadas-modal-value">{formatFecha(llamada.fecha)}</span>
          </div>
          <div className="llamadas-modal-field">
            <span className="llamadas-modal-label">Hora</span>
            <span className="llamadas-modal-value">{formatHora(llamada.hora)}</span>
          </div>
          <div className="llamadas-modal-field">
            <span className="llamadas-modal-label">Duración</span>
            <span className="llamadas-modal-value">{formatDuracion(llamada.duracion)}</span>
          </div>
          <div className="llamadas-modal-field">
            <span className="llamadas-modal-label">Motivo de finalización</span>
            <span className="llamadas-modal-value">
              <span className={`motivo-badge motivo-badge--${tipo}`}>{largo}</span>
            </span>
          </div>
          <div className="llamadas-modal-field">
            <span className="llamadas-modal-label">Coste</span>
            <span className="llamadas-modal-value">{formatCoste(llamada.coste)}</span>
          </div>
          <div className="llamadas-modal-field">
            <span className="llamadas-modal-label">Reserva vinculada</span>
            <span className="llamadas-modal-value">
              {llamada.reserva_id != null ? `#${llamada.reserva_id}` : '—'}
            </span>
          </div>
          {llamada.resumen && (
            <div className="llamadas-modal-field llamadas-modal-field--full">
              <span className="llamadas-modal-label">Resumen</span>
              <span className="llamadas-modal-value llamadas-modal-resumen">{llamada.resumen}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const defaultDesde = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
})()

const Llamadas = () => {
  const [llamadas, setLlamadas] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filterDesde, setFilterDesde] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [filterHasta, setFilterHasta] = useState('')
  const [selectedLlamada, setSelectedLlamada] = useState(null)
  const [sortField, setSortField] = useState('fecha')
  const [sortAsc, setSortAsc] = useState(false)
  const sentinelRef = useRef(null)

  const loadPage = useCallback(async (pageNum, desde, hasta, field, asc) => {
    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('llamadas')
      .select('*')
      .order(field, { ascending: asc })
    if (field === 'fecha') {
      query = query.order('hora', { ascending: asc })
    }
    query = query.range(from, to)
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)

    const { data } = await query
    const items = data ?? []

    if (pageNum === 0) {
      setLlamadas(items)
      setInitialLoading(false)
    } else {
      setLlamadas(prev => [...prev, ...items])
      setLoadingMore(false)
    }

    setHasMore(items.length >= PAGE_SIZE)
    setPage(pageNum)
  }, [])

  const handleSort = useCallback((field) => {
    setSortField(prevField => {
      const newField = field
      setSortAsc(prevAsc => {
        const newAsc = prevField === field ? !prevAsc : false
        setLlamadas([])
        setPage(0)
        setHasMore(true)
        setInitialLoading(true)
        loadPage(0, filterDesde, filterHasta, newField, newAsc)
        return newAsc
      })
      return newField
    })
  }, [filterDesde, filterHasta, loadPage])

  // Reset and reload when filters change
  useEffect(() => {
    setLlamadas([])
    setPage(0)
    setHasMore(true)
    setInitialLoading(true)
    loadPage(0, filterDesde, filterHasta, sortField, sortAsc)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDesde, filterHasta, loadPage])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading) {
          setLoadingMore(true)
          loadPage(page + 1, filterDesde, filterHasta, sortField, sortAsc)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, initialLoading, page, filterDesde, filterHasta, sortField, sortAsc, loadPage])

  const hasFilters = filterDesde !== defaultDesde || filterHasta !== ''
  const clearFilters = () => {
    setFilterDesde(defaultDesde)
    setFilterHasta('')
  }

  return (
    <div className="llamadas-dash">
      <div className="dash-page-header">
        <h1>
          Llamadas
          {!initialLoading && <span className="dash-count">{llamadas.length} llamadas cargadas</span>}
        </h1>
      </div>

      <div className="llamadas-filters">
        <label className="dash-filter-label">
          Desde
          <input
            type="date"
            className="dash-input"
            value={filterDesde}
            onChange={(e) => setFilterDesde(e.target.value)}
          />
        </label>
        <label className="dash-filter-label">
          Hasta
          <input
            type="date"
            className="dash-input"
            value={filterHasta}
            onChange={(e) => setFilterHasta(e.target.value)}
          />
        </label>
        {hasFilters ? (
          <button className="dash-btn-outline" onClick={clearFilters}>Limpiar filtros</button>
        ) : null}
      </div>

      {initialLoading ? (
        <div className="dash-loading">Cargando llamadas...</div>
      ) : llamadas.length === 0 ? (
        <div className="dash-empty">No hay llamadas para el rango seleccionado.</div>
      ) : (
        <div className="llamadas-table-wrap">
          <table className="llamadas-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('fecha')}>
                  Fecha{sortField === 'fecha' ? <span className="sort-indicator">{sortAsc ? '▲' : '▼'}</span> : ''}
                </th>
                <th className="sortable" onClick={() => handleSort('hora')}>
                  Hora{sortField === 'hora' ? <span className="sort-indicator">{sortAsc ? '▲' : '▼'}</span> : ''}
                </th>
                <th className="sortable" onClick={() => handleSort('telefono')}>
                  Teléfono{sortField === 'telefono' ? <span className="sort-indicator">{sortAsc ? '▲' : '▼'}</span> : ''}
                </th>
                <th className="sortable" onClick={() => handleSort('duracion')}>
                  Duración{sortField === 'duracion' ? <span className="sort-indicator">{sortAsc ? '▲' : '▼'}</span> : ''}
                </th>
                <th>Motivo</th>
                <th className="sortable" onClick={() => handleSort('coste')}>
                  Coste{sortField === 'coste' ? <span className="sort-indicator">{sortAsc ? '▲' : '▼'}</span> : ''}
                </th>
                <th>Resumen</th>
                <th>Reserva</th>
              </tr>
            </thead>
            <tbody>
              {llamadas.map((l) => (
                <tr key={l.id} onClick={() => setSelectedLlamada(l)}>
                  <td>{formatFecha(l.fecha)}</td>
                  <td>{formatHora(l.hora)}</td>
                  <td>{l.telefono ?? '—'}</td>
                  <td>{formatDuracion(l.duracion)}</td>
                  <td><MotivoBadge motivo={l.motivo_finalizacion} /></td>
                  <td>{formatCoste(l.coste)}</td>
                  <td>
                    <span className="resumen-cell" title={l.resumen ?? ''}>
                      {l.resumen ?? '—'}
                    </span>
                  </td>
                  <td>{l.reserva_id != null ? `#${l.reserva_id}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && (
        <div className="dash-loading" style={{ padding: '16px 0' }}>Cargando más...</div>
      )}

      {selectedLlamada && (
        <LlamadaModal llamada={selectedLlamada} onClose={() => setSelectedLlamada(null)} />
      )}
    </div>
  )
}

export default Llamadas
