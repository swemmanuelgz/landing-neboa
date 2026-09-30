import { json, nexum, nexumConfigurado, preflight } from './_lib/nexum.js'

// GET /api/carta  →  nexum agent-carta (cartas, secciones, platos, fotos, 3D, menú del día).
// Caché 5 min en la CDN de Vercel y en el navegador. Las URLs firmadas de 3D/PDF
// caducan en 12 h (urls_expire_at), así que 5 min es seguro.
const CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=60'

export function OPTIONS() {
  return preflight()
}

export async function GET(request) {
  if (!nexumConfigurado()) return json({ ok: false, error: 'not_configured' }, 500, { 'Cache-Control': 'no-store' })

  const fecha = new URL(request.url).searchParams.get('fecha')
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return json({ ok: false, error: 'bad_request', message: 'fecha invalida (YYYY-MM-DD)' }, 400)
  }

  const r = await nexum('agent-carta', fecha ? { fecha } : {})
  if (!r.ok || r.data?.ok !== true) {
    console.error('[api/carta] agent-carta fallo', r.status, r.data?.error)
    return json({ ok: false, error: 'upstream_error', message: 'No se pudo cargar la carta' }, 502, { 'Cache-Control': 'no-store' })
  }
  return json(r.data, 200, { 'Cache-Control': CACHE })
}
