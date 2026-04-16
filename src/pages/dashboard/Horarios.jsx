import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import './Horarios.css'

function ToggleSwitch({ on, onToggle, danger, disabled }) {
  const classes = [
    'toggle-sw',
    on ? 'toggle-sw--on' : '',
    danger && on ? 'toggle-sw--danger' : '',
    disabled && !on ? 'toggle-sw--off-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      onClick={!disabled ? onToggle : undefined}
      role="switch"
      aria-checked={on}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onToggle()
        }
      }}
    />
  )
}

function DiaCard({ dia, canEdit, onToggle }) {
  const getStatusBadge = () => {
    if (dia.cerrado) {
      return <span className="horario-badge horario-badge--cerrado">Cerrado</span>
    }
    if (dia.solo_mediodia) {
      return <span className="horario-badge horario-badge--mediodia">Solo mediodia</span>
    }
    return <span className="horario-badge horario-badge--abierto">Mediodia y cena</span>
  }

  return (
    <div className={`horario-dia-card${dia.cerrado ? ' horario-dia-card--cerrado' : ''}`}>
      <div className="horario-dia-nombre">{dia.nombre}</div>

      <div className="horario-dia-toggles">
        <div
          className={`horario-toggle-row${!canEdit ? ' horario-toggle-row--disabled' : ''}`}
          onClick={canEdit ? () => onToggle(dia.dia_semana, 'cerrado') : undefined}
        >
          <span className="horario-toggle-label">Cerrado</span>
          <ToggleSwitch
            on={dia.cerrado}
            danger
            disabled={!canEdit}
            onToggle={() => onToggle(dia.dia_semana, 'cerrado')}
          />
        </div>

        <div
          className={`horario-toggle-row${dia.cerrado || !canEdit ? ' horario-toggle-row--disabled' : ''}`}
          onClick={canEdit && !dia.cerrado ? () => onToggle(dia.dia_semana, 'solo_mediodia') : undefined}
        >
          <span className="horario-toggle-label">Solo mediodia</span>
          <ToggleSwitch
            on={dia.solo_mediodia}
            disabled={dia.cerrado || !canEdit}
            onToggle={() => onToggle(dia.dia_semana, 'solo_mediodia')}
          />
        </div>
      </div>

      <div className="horario-dia-status">{getStatusBadge()}</div>
    </div>
  )
}

function tipoBadgeStyle(tipo) {
  if (tipo === 'cerrado') return { background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.35)', color: '#e57373' }
  if (tipo === 'abierto') return { background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.35)', color: '#81c784' }
  if (tipo === 'cena_especial') return { background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.35)', color: '#ffb74d' }
  return {}
}

function formatFecha(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-')
  return `${d}/${m}/${y}`
}

export default function Horarios() {
  const { role } = useAuth()
  const canEdit = role !== 'worker'

  const [dias, setDias] = useState([])
  const [diasLoading, setDiasLoading] = useState(true)

  const [excepciones, setExcepciones] = useState([])
  const [excLoading, setExcLoading] = useState(true)

  const [newFecha, setNewFecha] = useState('')
  const [newTipo, setNewTipo] = useState('cerrado')
  const [newDesc, setNewDesc] = useState('')
  const [addingExc, setAddingExc] = useState(false)

  useEffect(() => {
    const fetchDias = async () => {
      setDiasLoading(true)
      const { data, error } = await supabase
        .from('horarios_semanales')
        .select('*')
        .order('dia_semana')
      if (!error && data) setDias(data)
      setDiasLoading(false)
    }

    const fetchExcepciones = async () => {
      setExcLoading(true)
      const { data, error } = await supabase
        .from('excepciones_calendario')
        .select('*')
        .order('fecha')
      if (!error && data) setExcepciones(data)
      setExcLoading(false)
    }

    fetchDias()
    fetchExcepciones()
  }, [])

  const handleToggle = async (diaSemana, field) => {
    const idx = dias.findIndex((d) => d.dia_semana === diaSemana)
    if (idx === -1) return

    const current = dias[idx]
    let updated = { ...current }

    if (field === 'cerrado') {
      updated.cerrado = !current.cerrado
      if (updated.cerrado) updated.solo_mediodia = false
    } else if (field === 'solo_mediodia') {
      if (current.cerrado) return
      updated.solo_mediodia = !current.solo_mediodia
    }

    const newDias = [...dias]
    newDias[idx] = updated
    setDias(newDias)

    await supabase
      .from('horarios_semanales')
      .update({ cerrado: updated.cerrado, solo_mediodia: updated.solo_mediodia })
      .eq('dia_semana', diaSemana)
  }

  const handleAddExcepcion = async (e) => {
    e.preventDefault()
    if (!newFecha) return
    setAddingExc(true)

    const optimistic = {
      id: `temp-${Date.now()}`,
      fecha: newFecha,
      tipo: newTipo,
      descripcion: newDesc || null,
    }
    setExcepciones((prev) => [...prev, optimistic].sort((a, b) => a.fecha.localeCompare(b.fecha)))

    const { data, error } = await supabase
      .from('excepciones_calendario')
      .insert({ fecha: newFecha, tipo: newTipo, descripcion: newDesc || null })
      .select()
      .single()

    if (!error && data) {
      setExcepciones((prev) =>
        prev.map((exc) => (exc.id === optimistic.id ? data : exc))
      )
      setNewFecha('')
      setNewTipo('cerrado')
      setNewDesc('')
    } else {
      setExcepciones((prev) => prev.filter((exc) => exc.id !== optimistic.id))
    }

    setAddingExc(false)
  }

  const handleDeleteExcepcion = async (id) => {
    if (!window.confirm('¿Eliminar esta excepcion?')) return

    setExcepciones((prev) => prev.filter((exc) => exc.id !== id))

    await supabase.from('excepciones_calendario').delete().eq('id', id)
  }

  return (
    <div className="horarios-dash">
      <div className="dash-page-header">
        <h1>Horarios</h1>
      </div>

      <section>
        <h2 className="horarios-section-title">Horario semanal</h2>
        <p className="horarios-section-desc">
          {canEdit
            ? 'Activa o desactiva dias y servicios. Los cambios se guardan automaticamente.'
            : 'Vista del horario semanal actual.'}
        </p>

        {diasLoading ? (
          <div className="dash-loading">Cargando horarios...</div>
        ) : dias.length === 0 ? (
          <div className="dash-empty">No se encontraron dias.</div>
        ) : (
          <div className="horarios-dias-grid">
            {dias.map((dia) => (
              <DiaCard
                key={dia.dia_semana}
                dia={dia}
                canEdit={canEdit}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </section>

      <div className="dash-section-separator" />

      <section>
        <h2 className="horarios-section-title">Excepciones del calendario</h2>
        <p className="horarios-section-desc">
          Dias puntuales con un horario diferente al habitual.
        </p>

        {canEdit && (
          <form className="excepciones-form" onSubmit={handleAddExcepcion}>
            <input
              type="date"
              className="dash-input"
              value={newFecha}
              onChange={(e) => setNewFecha(e.target.value)}
              required
            />
            <select
              className="dash-select"
              value={newTipo}
              onChange={(e) => setNewTipo(e.target.value)}
            >
              <option value="cerrado">Cerrado</option>
              <option value="abierto">Abierto</option>
              <option value="cena_especial">Cena especial</option>
            </select>
            <input
              type="text"
              className="dash-input excepciones-form-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descripcion (opcional)"
            />
            <button type="submit" className="dash-btn-primary" disabled={addingExc}>
              {addingExc ? 'Añadiendo...' : 'Añadir'}
            </button>
          </form>
        )}

        {excLoading ? (
          <div className="dash-loading">Cargando excepciones...</div>
        ) : excepciones.length === 0 ? (
          <div className="dash-empty">No hay excepciones registradas.</div>
        ) : (
          <div className="excepciones-list">
            {excepciones.map((exc) => (
              <div key={exc.id} className="excepcion-row">
                <span className="excepcion-fecha">{formatFecha(exc.fecha)}</span>
                <span
                  className="excepcion-tipo-badge"
                  style={tipoBadgeStyle(exc.tipo)}
                >
                  {exc.tipo === 'cena_especial' ? 'Cena especial' : exc.tipo.charAt(0).toUpperCase() + exc.tipo.slice(1)}
                </span>
                {exc.descripcion && (
                  <span className="excepcion-desc">{exc.descripcion}</span>
                )}
                {canEdit && (
                  <button
                    className="dash-btn-danger excepcion-delete"
                    onClick={() => handleDeleteExcepcion(exc.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
