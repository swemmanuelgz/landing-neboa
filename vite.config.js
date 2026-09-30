import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Variables de servidor que usan las funciones de api/ (NUNCA con prefijo VITE_).
const SERVER_ENV = ['NEXUM_URL', 'NEXUM_AGENT_TOKEN']

/**
 * Solo en `vite dev`: sirve /api/<nombre> con los mismos handlers que Vercel
 * (api/<nombre>.js, exports GET/POST/OPTIONS con Request → Response).
 * En producción los sirve Vercel directamente.
 */
function apiDev(mode) {
  return {
    name: 'neboa-api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '')
      for (const k of SERVER_ENV) if (env[k] && !process.env[k]) process.env[k] = env[k]

      server.middlewares.use(async (req, res, next) => {
        const m = /^\/api\/([a-z0-9-]+)\/?(\?.*)?$/i.exec(req.url || '')
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
          const handler = mod[req.method]
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end('Method Not Allowed')
          }
          const chunks = []
          for await (const c of req) chunks.push(c)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(`[api dev] ${e?.stack || e}`)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: 'dev_api_error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiDev(mode)],
}))
