import { json, nexum, nexumConfigurado, preflight } from './_lib/nexum.js'

/**
 * POST /api/reservas  ·  landing de Restaurante Néboa
 *
 *   { action:"check",  fecha, hora, invitados }
 *   { action:"create", fecha, hora, invitados, nombre, telefono, notas?, source }
 *
 *   landing → /api/reservas → nexum agent-check-availability / agent-create-reservation
 *
 * Al crear, nexum ya manda el aviso (Gmail al restaurante, WhatsApp al cliente y
 * evento en el Google Calendar de Néboa). Aquí NO se llama a n8n: duplicaría avisos.
 *
 * Sustituye a la Edge Function `reservas-web` del Supabase viejo. Mantiene su
 * contrato de respuesta (estado: disponible | alternativas | grupo_grande |
 * no_disponible | reserva_creada) para no tocar el formulario.
 */

const MAX_INVITADOS = 20
const MAX_DIAS_ANTELACION = 30

const bad = (error, detalle) => json({ ok: false, error, detalle: detalle ?? null }, 400)

function hoyMadrid() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function sumarDias(iso, dias) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function validar(body, crear) {
  const fecha = String(body.fecha ?? '').trim()
  let hora = String(body.hora ?? '').trim()
  const invitados = Number.parseInt(String(body.invitados ?? ''), 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'fecha invalida (YYYY-MM-DD)'
  if (!/^\d{1,2}:\d{2}$/.test(hora)) return 'hora invalida (HH:MM)'
  if (hora.length === 4) hora = '0' + hora
  if (!Number.isFinite(invitados) || invitados < 1) return 'invitados invalido'
  if (invitados > MAX_INVITADOS) return `para mas de ${MAX_INVITADOS} personas hay que llamar al restaurante`

  const hoy = hoyMadrid()
  if (fecha <= hoy) return 'solo se puede reservar a partir de manana'
  if (fecha > sumarDias(hoy, MAX_DIAS_ANTELACION)) return `solo se puede reservar con ${MAX_DIAS_ANTELACION} dias de antelacion`

  let nombre = ''
  let telefono = ''
  let notas = ''
  if (crear) {
    nombre = String(body.nombre ?? '').trim()
    if (nombre.length < 2 || nombre.length > 80) return 'nombre invalido'
    const digitos = String(body.telefono ?? '').replace(/[^0-9]/g, '')
    if (digitos.length < 8 || digitos.length > 15) return 'telefono invalido'
    telefono = digitos
    notas = String(body.notas ?? '').trim().slice(0, 500)
  }

  return {
    fecha, hora, invitados, nombre, telefono,
    telefonoE164: telefono ? '+' + telefono : '',
    notas,
    source: String(body.source ?? 'web').trim().toLowerCase(),
  }
}

/** Traduce la respuesta de nexum al vocabulario que ya entiende la landing. */
function traducirDisponibilidad(v, d) {
  const disponible = d.available === true
  const reason = String(d.reason ?? '')
  const alternativas = Array.isArray(d.alternatives) ? d.alternatives : []
  let estado = 'no_disponible'
  if (disponible) estado = 'disponible'
  else if (reason === 'party_too_large') estado = 'grupo_grande'
  else if (alternativas.length > 0) estado = 'alternativas'
  return {
    estado,
    fecha: v.fecha,
    hora: v.hora,
    invitados: v.invitados,
    turno: d.shift ?? null,
    mensaje: d.message ?? null,
    alternativas,
    motivo: reason,
  }
}

export function OPTIONS() {
  return preflight()
}

export async function POST(request) {
  if (!nexumConfigurado()) return json({ ok: false, error: 'configuracion del servidor incompleta' }, 500)

  let body
  try {
    body = await request.json()
  } catch {
    return bad('json invalido')
  }
  if (!body || typeof body !== 'object') return bad('json invalido')

  const action = String(body.action ?? '').trim()
  if (action !== 'check' && action !== 'create') return bad('action debe ser check o create')

  const v = validar(body, action === 'create')
  if (typeof v === 'string') return bad(v)

  if (action === 'check') {
    const r = await nexum('agent-check-availability', { date: v.fecha, time: v.hora, party_size: v.invitados })
    if (!r.ok) return json({ ok: false, error: 'no se pudo consultar disponibilidad' }, 502)
    return json(traducirDisponibilidad(v, r.data))
  }

  const r = await nexum('agent-create-reservation', {
    date: v.fecha,
    time: v.hora,
    party_size: v.invitados,
    phone: v.telefono,
    name: v.nombre,
    notes: v.notas || null,
    source: 'web',
  })
  if (!r.ok) return json({ ok: false, error: 'no se pudo crear la reserva' }, 502)

  const d = r.data
  // Rechazo de negocio: nexum contesta 200 con ok:false y un mensaje ya redactado.
  if (d.ok !== true || d.created !== true) return json(traducirDisponibilidad(v, d))

  const reserva = d.reservation ?? {}
  const salida = {
    estado: 'reserva_creada',
    reserva_id: reserva.id,
    codigo: reserva.code ?? null,
    mesa: reserva.table_code ?? null,
    fecha: v.fecha,
    hora: v.hora,
    invitados: v.invitados,
    nombre: v.nombre,
    telefono: v.telefonoE164,
    mensaje: d.message ?? null,
    alternativas: [],
  }

  return json(salida)
}
