import { useCallback, useRef, useState } from 'react'

// La carta vive en nexum-restaurant. La landing la lee a traves de la
// Edge Function `carta-web` de este proyecto (el token de agente nunca
// llega al navegador).
const CARTA_WEB_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/carta-web`
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const TIMEOUT_MS = 15000
// Pasado este tiempo se vuelve a pedir al abrir la carta (las URLs 3D caducan).
const REFRESCO_MS = 5 * 60 * 1000

// Solo en desarrollo: VITE_CARTA_MOCK=1 usa datos de ejemplo (fotos + 3D).
const USAR_MOCK = import.meta.env.DEV && import.meta.env.VITE_CARTA_MOCK === '1'

async function pedirCarta() {
  if (USAR_MOCK) {
    const { default: mock } = await import('./cartaMock.js')
    await new Promise((r) => setTimeout(r, 600))
    return mock
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(CARTA_WEB_URL, {
      method: 'GET',
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: controller.signal,
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (!res.ok || !data || data.ok !== true) throw new Error(data?.error || `HTTP ${res.status}`)
    return data
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('TIMEOUT')
    throw e
  } finally {
    clearTimeout(t)
  }
}

/** estado: idle | loading | ready | error */
export default function useCarta() {
  const [estado, setEstado] = useState('idle')
  const [data, setData] = useState(null)
  const dataRef = useRef(null)
  const cargadoEn = useRef(0)
  const enCurso = useRef(null)

  const cargar = useCallback((forzar = false) => {
    if (enCurso.current) return enCurso.current
    const fresco = Date.now() - cargadoEn.current < REFRESCO_MS
    if (!forzar && dataRef.current && fresco) return Promise.resolve()

    if (!dataRef.current) setEstado('loading')
    enCurso.current = pedirCarta()
      .then((d) => {
        cargadoEn.current = Date.now()
        dataRef.current = d
        setData(d)
        setEstado('ready')
      })
      .catch((e) => {
        console.error('[carta] no se pudo cargar:', e.message)
        // Si ya habia datos, se siguen mostrando.
        if (!dataRef.current) setEstado('error')
      })
      .finally(() => {
        enCurso.current = null
      })
    return enCurso.current
  }, [])

  return { estado, data, cargar }
}
