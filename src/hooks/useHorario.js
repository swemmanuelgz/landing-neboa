import { useState, useEffect } from 'react'

// El horario vive en nexum-restaurant. La landing lo lee a través de /api/horario
// (función serverless de Vercel que llama a agent-restaurant-info con el token del
// restaurante; el token nunca llega al navegador).
const HORARIO_URL = '/api/horario'

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const hhmm = (t) => (t ? String(t).slice(0, 5) : null)

/**
 * Pasa una excepción de nexum al vocabulario de la landing.
 * nexum: { date, type: 'cierre' | 'cena_especial' | 'aforo_reducido' | 'otro', closed, description }
 * landing: 'cerrado' | 'cena_especial' (aforo_reducido / otro se pueden reservar con normalidad).
 */
function tipoExcepcion(e) {
  if (e.closed === true || e.type === 'cierre') return 'cerrado'
  if (e.type === 'cena_especial') return 'cena_especial'
  return null
}

/**
 * Adapta la respuesta de /api/horario a las estructuras que ya usan Horario y Reservas:
 *  - horariosPorDia: Map<dia_semana, { dia_semana, nombre, cerrado, solo_mediodia }>
 *  - configuracion: { turno_mediodia_inicio/fin, turno_noche_inicio/fin }
 *  - excepcionesPorFecha: Map<'YYYY-MM-DD', 'abierto' | 'cerrado' | 'cena_especial'>
 */
export function adaptarHorario(d) {
  const horariosPorDia = new Map(
    (d.weekly || []).map((w) => [
      Number(w.dow),
      {
        dia_semana: Number(w.dow),
        nombre: w.name || NOMBRES_DIA[Number(w.dow)],
        cerrado: w.closed === true,
        solo_mediodia: w.lunch_only === true,
      },
    ]),
  )

  const turno = (tipo) => (d.shifts || []).find((s) => s.type === tipo) || null
  const mediodia = turno('mediodia')
  const noche = turno('noche')
  const configuracion = {
    turno_mediodia_inicio: hhmm(mediodia?.from),
    turno_mediodia_fin: hhmm(mediodia?.to),
    turno_noche_inicio: hhmm(noche?.from),
    turno_noche_fin: hhmm(noche?.to),
  }

  const excepcionesPorFecha = new Map()
  for (const e of d.exceptions || []) {
    const fecha = String(e.date ?? '').slice(0, 10)
    const tipo = tipoExcepcion(e)
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && tipo) excepcionesPorFecha.set(fecha, tipo)
  }

  return { horariosPorDia, configuracion, excepcionesPorFecha }
}

// Una sola petición por carga de página aunque haya varios componentes usando el hook.
let peticion = null
function pedirHorario() {
  if (!peticion) {
    peticion = fetch(HORARIO_URL, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok || !data || data.ok !== true) throw new Error(data?.error || `HTTP ${res.status}`)
        return adaptarHorario(data)
      })
      .catch((e) => {
        peticion = null // permite reintentar en el siguiente montaje
        throw e
      })
  }
  return peticion
}

export const useHorario = () => {
  const [estado, setEstado] = useState({
    horariosPorDia: null,
    configuracion: null,
    excepcionesPorFecha: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let vivo = true
    pedirHorario()
      .then((h) => vivo && setEstado({ ...h, loading: false, error: null }))
      .catch((err) => {
        console.error('useHorario: error cargando horarios', err)
        if (vivo) setEstado((s) => ({ ...s, loading: false, error: err }))
      })
    return () => { vivo = false }
  }, [])

  return estado
}

// ─── Pure helpers (exported so Reservas.jsx can use them) ──────────────────

/** Formatea 'HH:MM:SS' → 'HH:MM' */
export const formatTime = (t) => (t ? String(t).slice(0, 5) : '')

/** Genera slots cada 30 min entre inicio y fin (inclusive) */
export const generarHoras = (inicio, fin) => {
  const horas = []
  if (!inicio || !fin) return horas
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
