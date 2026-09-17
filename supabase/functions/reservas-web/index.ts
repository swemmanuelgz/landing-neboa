import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * reservas-web
 * Punto de entrada UNICO de la landing para reservar.
 *
 *   { action: "check",  fecha, hora, invitados }
 *   { action: "create", fecha, hora, invitados, nombre, telefono, notas?, source }
 *
 * `check`  -> RPC verificar_disponibilidad
 * `create` -> RPC crear_reserva (revalida disponibilidad dentro de la transaccion)
 *             y, si source es web/landing, dispara el side effect en n8n
 *             (NEBOA-RESERVAS-SIDEFFECT: Google Calendar + Gmail + WhatsApp).
 *
 * No toca el workflow del agente de voz.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIDEEFFECT_TIMEOUT_MS = 20_000;
const MAX_INVITADOS = 20;
const MAX_DIAS_ANTELACION = 30;
const WEB_SOURCES = new Set(["web", "landing", "landing_web"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bad(error: string, detalle?: unknown) {
  return json({ ok: false, error, detalle: detalle ?? null }, 400);
}

/** Fecha de hoy en Europe/Madrid como YYYY-MM-DD. */
function hoyMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

type Validado = {
  fecha: string;
  hora: string;
  invitados: number;
  nombre: string;
  telefono: string;
  notas: string;
  source: string;
};

function validar(body: Record<string, unknown>, crear: boolean): Validado | string {
  const fecha = String(body.fecha ?? "").trim();
  let hora = String(body.hora ?? "").trim();
  const invitados = Number.parseInt(String(body.invitados ?? ""), 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "fecha invalida (YYYY-MM-DD)";
  if (!/^\d{1,2}:\d{2}$/.test(hora)) return "hora invalida (HH:MM)";
  if (hora.length === 4) hora = "0" + hora;
  if (!Number.isFinite(invitados) || invitados < 1) return "invitados invalido";
  if (invitados > MAX_INVITADOS) {
    return `para mas de ${MAX_INVITADOS} personas hay que llamar al restaurante`;
  }

  const hoy = hoyMadrid();
  if (fecha <= hoy) return "solo se puede reservar a partir de manana";
  if (fecha > sumarDias(hoy, MAX_DIAS_ANTELACION)) {
    return `solo se puede reservar con ${MAX_DIAS_ANTELACION} dias de antelacion`;
  }

  let nombre = "";
  let telefono = "";
  let notas = "";
  if (crear) {
    nombre = String(body.nombre ?? "").trim();
    if (nombre.length < 2 || nombre.length > 80) return "nombre invalido";

    const digitos = String(body.telefono ?? "").replace(/[^0-9]/g, "");
    if (digitos.length < 8 || digitos.length > 15) return "telefono invalido";
    telefono = "+" + digitos;

    notas = String(body.notas ?? "").trim().slice(0, 500);
  }

  return {
    fecha,
    hora,
    invitados,
    nombre,
    telefono,
    notas,
    source: String(body.source ?? "web").trim().toLowerCase(),
  };
}

async function rpc(name: string, args: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key!,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(args),
  });
  const texto = await res.text();
  let data: unknown = null;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = texto;
  }
  return { ok: res.ok, status: res.status, data };
}

/** Guarda el id del evento de Calendar en la reserva. Best effort. */
async function guardarEventoCalendar(reservaId: number, eventId: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  try {
    await fetch(`${url}/rest/v1/reservas?id=eq.${reservaId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: key!,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ calendar_event_id: eventId }),
    });
  } catch (_e) { /* no es critico */ }
}

/** Dispara NEBOA-RESERVAS-SIDEFFECT. Nunca lanza: la reserva ya esta creada. */
async function dispararSideEffect(payload: Record<string, unknown>) {
  const url = Deno.env.get("N8N_SIDEEFFECT_URL");
  const jwt = Deno.env.get("N8N_JWT_SECRET");
  if (!url || !jwt) {
    return { ok: false, error: "side effect no configurado" };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SIDEEFFECT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const texto = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = texto ? JSON.parse(texto) : {};
    } catch {
      data = { raw: texto };
    }
    if (!res.ok) return { ok: false, error: `n8n HTTP ${res.status}`, ...data };
    return {
      ok: data.ok === true,
      calendar_ok: data.calendar_ok ?? null,
      calendar_event_id: data.calendar_event_id ?? null,
      calendar_link: data.calendar_link ?? null,
      error: (data.calendar_error as string) ?? null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fallo desconocido" };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "metodo no permitido" }, 405);

  if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return json({ ok: false, error: "configuracion del servidor incompleta" }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("json invalido");
  }

  const action = String(body.action ?? "").trim();
  if (action !== "check" && action !== "create") return bad("action debe ser check o create");

  const v = validar(body, action === "create");
  if (typeof v === "string") return bad(v);

  // ---- CHECK -------------------------------------------------------------
  if (action === "check") {
    const r = await rpc("verificar_disponibilidad", {
      p_fecha: v.fecha,
      p_hora: v.hora,
      p_invitados: v.invitados,
    });
    if (!r.ok) return json({ ok: false, error: "no se pudo consultar disponibilidad" }, 502);
    return json(r.data);
  }

  // ---- CREATE ------------------------------------------------------------
  const r = await rpc("crear_reserva", {
    p_fecha: v.fecha,
    p_hora: v.hora,
    p_invitados: v.invitados,
    p_nombre: v.nombre,
    p_telefono: v.telefono,
    p_notas: v.notas,
    p_estado: "confirmada",
  });
  if (!r.ok) return json({ ok: false, error: "no se pudo crear la reserva" }, 502);

  const data = (r.data ?? {}) as Record<string, unknown>;
  if (data.estado !== "reserva_creada") {
    // Sin hueco: devolvemos tal cual el resultado de disponibilidad.
    return json(data);
  }

  if (!WEB_SOURCES.has(v.source)) {
    return json({ ...data, sideeffect: { ok: false, error: "source no web, side effect omitido" } });
  }

  const sideeffect = await dispararSideEffect({
    reserva_id: data.reserva_id,
    nombre: v.nombre,
    telefono: v.telefono,
    fecha: v.fecha,
    hora: v.hora,
    invitados: v.invitados,
    notas: v.notas,
    turno: data.turno,
    source: v.source,
  });

  if (sideeffect.ok && sideeffect.calendar_event_id) {
    await guardarEventoCalendar(Number(data.reserva_id), String(sideeffect.calendar_event_id));
  }

  return json({ ...data, sideeffect });
});
