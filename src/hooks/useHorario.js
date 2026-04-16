import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetches schedule data from Supabase:
 *  - horarios_semanales: one row per day (0=Sun … 6=Sat), cerrado + solo_mediodia flags
 *  - configuracion_restaurante: turno times and display times
 *  - excepciones_calendario: one-off open/closed/cena_especial dates
 *
 * Returns a Map keyed by dia_semana (0-6) for O(1) day lookup plus helpers.
 */
export const useHorario = () => {
  const [horariosPorDia, setHorariosPorDia] = useState(null)   // Map<dia_semana, row>
  const [configuracion, setConfiguracion] = useState(null)
  const [excepcionesPorFecha, setExcepcionesPorFecha] = useState(null) // Map<'YYYY-MM-DD', tipo>
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]

        const [horariosRes, configRes, excepcionesRes] = await Promise.all([
          supabase.from('horarios_semanales').select('*').order('dia_semana'),
          supabase.from('configuracion_restaurante').select('*').eq('id', 1).single(),
          supabase
            .from('excepciones_calendario')
            .select('*')
            .gte('fecha', today)
            .order('fecha'),
        ])

        if (horariosRes.error) throw horariosRes.error
        if (configRes.error) throw configRes.error
        if (excepcionesRes.error) throw excepcionesRes.error

        // Build Maps for O(1) lookups
        const diasMap = new Map(horariosRes.data.map(h => [h.dia_semana, h]))
        const excepMap = new Map(excepcionesRes.data.map(e => [e.fecha, e.tipo]))

        setHorariosPorDia(diasMap)
        setConfiguracion(configRes.data)
        setExcepcionesPorFecha(excepMap)
      } catch (err) {
        console.error('useHorario: error cargando horarios', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  return { horariosPorDia, configuracion, excepcionesPorFecha, loading, error }
}

// ─── Pure helpers (exported so Reservas.jsx can use them) ──────────────────

/** Formatea 'HH:MM:SS' → 'HH:MM' */
export const formatTime = (t) => (t ? t.slice(0, 5) : '')

/** Genera slots cada 30 min entre inicio y fin (inclusive) */
export const generarHoras = (inicio, fin) => {
  const horas = []
  let [h, m] = inicio.split(':').map(Number)
  const [finH, finM] = fin.split(':').map(Number)
  while (h < finH || (h === finH && m <= finM)) {
    horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += 30
    if (m >= 60) { m = 0; h++ }
  }
  return horas
}

/**
 * ¿Está cerrado este día/fecha?
 * Prioridad: excepción abierta > excepción cerrada > horario semanal
 */
export const estaDiaCerrado = (diaSemana, fecha, horariosPorDia, excepcionesPorFecha) => {
  const excepcion = excepcionesPorFecha?.get(fecha)
  if (excepcion === 'abierto') return false
  if (excepcion === 'cerrado') return true
  return horariosPorDia?.get(diaSemana)?.cerrado ?? false
}

/**
 * ¿Este día solo abre a mediodía (sin cenas)?
 * Prioridad: cena_especial override > horario semanal
 */
export const esSoloMediodia = (diaSemana, fecha, horariosPorDia, excepcionesPorFecha) => {
  if (excepcionesPorFecha?.get(fecha) === 'cena_especial') return false
  return horariosPorDia?.get(diaSemana)?.solo_mediodia ?? false
}

/**
 * Devuelve los slots de hora disponibles para reservar en una fecha dada.
 * Usa los turnos de configuracion_restaurante de la BD.
 */
export const obtenerHorariosValidos = (diaSemana, fecha, horariosPorDia, excepcionesPorFecha, configuracion) => {
  if (!configuracion) return []
  if (estaDiaCerrado(diaSemana, fecha, horariosPorDia, excepcionesPorFecha)) return []

  const slots = generarHoras(
    formatTime(configuracion.turno_mediodia_inicio),
    formatTime(configuracion.turno_mediodia_fin)
  )

  if (!esSoloMediodia(diaSemana, fecha, horariosPorDia, excepcionesPorFecha)) {
    slots.push(
      ...generarHoras(
        formatTime(configuracion.turno_noche_inicio),
        formatTime(configuracion.turno_noche_fin)
      )
    )
  }

  return slots
}
