import { json, nexum, nexumConfigurado, preflight } from './_lib/nexum.js'

// GET /api/horario  →  nexum agent-restaurant-info (horario semanal, turnos, cierres,
// políticas). Solo se devuelve lo que necesita la landing. Caché 5 min.
const CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'
const DIAS_ADELANTE = 60

export function OPTIONS() {
  return preflight()
}

export async function GET() {
  if (!nexumConfigurado()) return json({ ok: false, error: 'not_configured' }, 500, { 'Cache-Control': 'no-store' })

  const r = await nexum('agent-restaurant-info', { days_ahead: DIAS_ADELANTE })
  const d = r.data || {}
  if (!r.ok || d.ok !== true) {
    console.error('[api/horario] agent-restaurant-info fallo', r.status, d.error)
    return json({ ok: false, error: 'upstream_error', message: 'No se pudo cargar el horario' }, 502, { 'Cache-Control': 'no-store' })
  }

  return json(
    {
      ok: true,
      now: d.now ?? null,
      weekly: Array.isArray(d.weekly) ? d.weekly : [],
      shifts: Array.isArray(d.shifts) ? d.shifts : [],
      exceptions: Array.isArray(d.exceptions) ? d.exceptions : [],
      policies: d.policies ?? null,
      restaurant: d.restaurant ? { name: d.restaurant.name, phone: d.restaurant.phone, timezone: d.restaurant.timezone } : null,
    },
    200,
    { 'Cache-Control': CACHE },
  )
}
