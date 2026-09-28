import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * carta-web  ·  landing de Restaurante Neboa
 *
 * La carta ya NO vive en la landing: se lee de nexum-restaurant.
 *
 *   landing  ->  carta-web (GET ?fecha=YYYY-MM-DD opcional)
 *            ->  nexum  agent-carta  (Bearer NEXUM_AGENT_TOKEN)
 *
 * El token de agente (NEXUM_AGENT_TOKEN) vive SOLO aqui, como secreto de la
 * Edge Function. El navegador nunca lo ve.
 *
 * Cache: 5 min en memoria del isolate + Cache-Control 5 min al navegador.
 * Las URLs firmadas de los modelos 3D / PDF caducan en 12 h (urls_expire_at),
 * asi que 5 min de cache es seguro.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const NEXUM_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_AGE_S = 300;
/** No servir desde cache si a las URLs firmadas les queda menos de esto. */
const URL_MARGEN_MS = 30 * 60_000;

type Entrada = { at: number; body: string };
const cache = new Map<string, Entrada>();

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

function error(status: number, code: string, message: string) {
  return json({ ok: false, error: code, message }, status, { "Cache-Control": "no-store" });
}

function cacheValida(e: Entrada | undefined): e is Entrada {
  if (!e || Date.now() - e.at > CACHE_TTL_MS) return false;
  try {
    const exp = Date.parse(JSON.parse(e.body)?.urls_expire_at ?? "");
    if (Number.isFinite(exp) && exp - Date.now() < URL_MARGEN_MS) return false;
  } catch {
    return false;
  }
  return true;
}

async function leerFecha(req: Request): Promise<string | null | undefined> {
  let fecha: unknown = new URL(req.url).searchParams.get("fecha");
  if (!fecha && req.method === "POST") {
    try {
      fecha = (await req.json())?.fecha;
    } catch {
      fecha = null;
    }
  }
  if (fecha === null || fecha === undefined || fecha === "") return null;
  const f = String(fecha).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : undefined; // undefined = invalida
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return error(405, "method_not_allowed", "Usa GET o POST");
  }

  const base = Deno.env.get("NEXUM_URL");
  const token = Deno.env.get("NEXUM_AGENT_TOKEN");
  if (!base || !token) return error(500, "not_configured", "carta no configurada");

  const fecha = await leerFecha(req);
  if (fecha === undefined) return error(400, "bad_request", "fecha invalida (YYYY-MM-DD)");

  const clave = fecha ?? "hoy";
  const enCache = cache.get(clave);
  if (cacheValida(enCache)) {
    return json(enCache.body, 200, {
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_S}`,
      "X-Carta-Cache": "HIT",
    });
  }

  const url = new URL(`${base.replace(/\/$/, "")}/functions/v1/agent-carta`);
  if (fecha) url.searchParams.set("fecha", fecha);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), NEXUM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
    });
    const texto = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(texto);
    } catch {
      data = null;
    }

    if (!res.ok || !data || data.ok !== true) {
      console.error("agent-carta fallo", res.status, texto.slice(0, 300));
      // Si nexum falla pero hay una copia reciente (aunque pasada de TTL) con URLs vivas, se sirve.
      if (enCache) {
        const exp = Date.parse(JSON.parse(enCache.body)?.urls_expire_at ?? "");
        if (!Number.isFinite(exp) || exp - Date.now() > URL_MARGEN_MS) {
          return json(enCache.body, 200, { "Cache-Control": "no-store", "X-Carta-Cache": "STALE" });
        }
      }
      return error(502, "upstream_error", "No se pudo cargar la carta");
    }

    // Desde la landing no hace falta nada mas: se devuelve el JSON tal cual.
    const body = JSON.stringify(data);
    cache.set(clave, { at: Date.now(), body });
    if (cache.size > 20) cache.delete(cache.keys().next().value!);

    return json(body, 200, {
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_S}`,
      "X-Carta-Cache": "MISS",
    });
  } catch (e) {
    const abort = e instanceof DOMException && e.name === "AbortError";
    console.error("agent-carta error", abort ? "timeout" : String(e));
    return error(504, abort ? "timeout" : "upstream_error", "No se pudo cargar la carta");
  } finally {
    clearTimeout(t);
  }
});
