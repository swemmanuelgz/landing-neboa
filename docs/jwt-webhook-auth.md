# Autenticación JWT para webhooks n8n (Néboa)

Arquitectura **master/child** con HS256.

## Secreto maestro

`JWT_MASTER_SECRET` (32 bytes, base64url). Vive SOLO en:
- Supabase → Edge Function `reservas-proxy` → Secrets
- n8n → Settings → Environment Variables (o `.env` del contenedor Easypanel)

Nunca se envía por red. Nunca va al frontend.

## Tokens hijos (firmados con el maestro)

| Nombre | sub | Dónde se usa |
|---|---|---|
| `JWT_WEB_LANDING` | `web-landing` | Secret en la Edge Function `reservas-proxy` (header Authorization al webhook) |
| `JWT_TELNYX_VOICE` | `telnyx-voice` | Asistente virtual Telnyx → header del webhook outbound |
| `JWT_N8N_INTERNAL` | `n8n-internal` | Credencial Header Auth en n8n (llamadas workflow→workflow) |

Claims: `{ sub, aud:"n8n-reservas", iss:"neboa-landing", iat, exp }` (1 año).

## Generar / rotar tokens

```bash
JWT_MASTER_SECRET=$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')
S="$JWT_MASTER_SECRET" node -e "
const jwt=require('jsonwebtoken');
const s=process.env.S;
const mk=(sub)=>jwt.sign({sub,aud:'n8n-reservas',iss:'neboa-landing'},s,{algorithm:'HS256',expiresIn:'365d'});
['web-landing','telnyx-voice','n8n-internal'].forEach(sub=>console.log(sub.toUpperCase().replace('-','_')+'='+mk(sub)));
"
```

## Nodo Code de validación en n8n (opción HMAC real)

Pega esto como **primer nodo** después de cada Webhook trigger. Modo: "Run Once for All Items".

```javascript
const crypto = require('crypto');

const secret = $env.JWT_MASTER_SECRET;
if (!secret) throw new Error('JWT_MASTER_SECRET no configurado en n8n');

// 1) Extraer header
const headers = $input.first().json.headers || {};
const auth = headers.authorization || headers.Authorization || '';
const m = auth.match(/^Bearer\s+(.+)$/i);
if (!m) throw new Error('Authorization Bearer ausente');
const token = m[1].trim();

// 2) Separar partes
const parts = token.split('.');
if (parts.length !== 3) throw new Error('JWT malformado');
const [h64, p64, s64] = parts;

// 3) Verificar firma HS256
const expected = crypto
  .createHmac('sha256', secret)
  .update(h64 + '.' + p64)
  .digest('base64')
  .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
if (expected !== s64) throw new Error('Firma JWT inválida');

// 4) Decodificar payload
const pad = (s) => s + '==='.slice((s.length + 3) % 4);
const payload = JSON.parse(
  Buffer.from(pad(p64).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
);

// 5) Validar claims
const now = Math.floor(Date.now() / 1000);
if (payload.exp && now >= payload.exp) throw new Error('JWT expirado');
if (payload.aud !== 'n8n-reservas') throw new Error('aud inválido');
const allowedSubs = ['web-landing', 'telnyx-voice', 'n8n-internal'];
if (!allowedSubs.includes(payload.sub)) throw new Error('sub no autorizado: ' + payload.sub);

// 6) Adjuntar identidad al item para nodos posteriores
return $input.all().map(item => ({
  json: { ...item.json, _auth: { sub: payload.sub, iss: payload.iss } }
}));
```

El workflow puede ramificar por `$json._auth.sub` (ej: distinto flujo para voz Telnyx vs web).

## Edge Function `reservas-proxy` (Supabase Deno)

```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const webhook = Deno.env.get('WEBHOOK_RESERVAS');   // URL del webhook n8n
  const jwt     = Deno.env.get('JWT_WEB_LANDING');    // token hijo
  if (!webhook || !jwt) return new Response('misconfigured', { status: 500 });

  const body = await req.text();
  const upstream = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body,
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
});
```

## Checklist de despliegue

- [ ] Supabase Dashboard → Edge Functions → `reservas-proxy` → Secrets: añadir `JWT_MASTER_SECRET`, `JWT_WEB_LANDING`, `WEBHOOK_RESERVAS`.
- [ ] n8n (Easypanel) → Variables de entorno: añadir `JWT_MASTER_SECRET`. Reiniciar contenedor.
- [ ] n8n → cada workflow con webhook expuesto: insertar el nodo Code de arriba tras el trigger.
- [ ] n8n → Credentials → crear Header Auth "n8n-internal" con `Authorization: Bearer <JWT_N8N_INTERNAL>` para llamadas internas.
- [ ] Telnyx Portal → asistente de voz → webhook outbound → header `Authorization: Bearer <JWT_TELNYX_VOICE>`.
- [ ] Probar: `curl` con token válido → 200. Sin token → 401. Token con `aud` distinto → 401.

## Rotación

1. Generar nuevo master + nuevos hijos con el snippet.
2. Actualizar secrets en Supabase, env en n8n, header en Telnyx.
3. Dejar 5 min de doble aceptación si quieres cero downtime (el nodo Code puede aceptar dos secrets temporalmente).
