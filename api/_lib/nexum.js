// Utilidades compartidas de las funciones serverless de la landing (Vercel).
// Los secretos (NEXUM_URL, NEXUM_AGENT_TOKEN, N8N_*) viven SOLO como variables de
// entorno del servidor (Vercel / .env local sin prefijo VITE_). Nunca en el bundle.

const NEXUM_TIMEOUT_MS = 15000

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS })
}

export function nexumConfigurado() {
  return Boolean(process.env.NEXUM_URL && process.env.NEXUM_AGENT_TOKEN)
}

/**
 * Llama a una Edge Function de nexum-restaurant con el token de agente de Néboa.
 * Nunca lanza: devuelve { ok, status, data }.
 */
export async function nexum(fn, payload, { method = 'POST', timeoutMs = NEXUM_TIMEOUT_MS } = {}) {
  const base = process.env.NEXUM_URL
  const token = process.env.NEXUM_AGENT_TOKEN
  if (!base || !token) return { ok: false, status: 500, data: { error: 'nexum_no_configurado' } }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `${base.replace(/\/$/, '')}/functions/v1/${fn}`
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
      signal: controller.signal,
    })
    const texto = await res.text()
    let data = {}
    try {
      data = texto ? JSON.parse(texto) : {}
    } catch {
      data = { raw: texto.slice(0, 300) }
    }
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    const timeout = e && e.name === 'AbortError'
    return { ok: false, status: 504, data: { error: timeout ? 'timeout' : 'fallo_de_red' } }
  } finally {
    clearTimeout(t)
  }
}
