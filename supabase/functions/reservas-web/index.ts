import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * reservas-web  ·  landing de Restaurante Neboa
 *
 * Neboa ya NO guarda sus reservas en este proyecto: vive en la plataforma
 * nexum-restaurant (restaurante id 3). Esta funcion es el unico punto de
 * entrada de la landing y actua de adaptador:
 *
 *   { action:"check",  fecha, hora, invitados }
 *   { action:"create", fecha, hora, invitados, nombre, telefono, notas?, source }
 *
 *        landing  ->  reservas-web  ->  nexum  agent-check-availability
 *                                   ->  nexum  agent-create-reservation
 *                                   ->  n8n    NEBOA-RESERVAS-SIDEFFECT
 *                                              (Calendar + Gmail + WhatsApp)
 *
 * El token de agente de nexum (NEXUM_AGENT_TOKEN) vive SOLO aqui, como secreto
 * de la Edge Function. Nunca se expone al navegador ni viaja en el bundle.
 *
 * Se conserva el contrato de respuesta que ya consume la landing
 * (estado: disponible | alternativas | grupo_grande | no_disponible |
 *  reserva_creada) para no acoplarla al vocabulario interno de nexum.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIDEEFFECT_TIMEOUT_MS = 20_000;
const NEXUM_TIMEOUT_MS = 20_000;
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
  /** Formato canonico de nexum: prefijo de pais SIN '+' (34632079379). */
  telefono: string;
  telefonoE164: string;
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
    telefono = digitos;

    notas = String(body.notas ?? "").trim().slice(0, 500);
  }

  return {
    fecha,
    hora,
    invitados,
    nombre,
    telefono,
    telefonoE164: telefono ? "+" + telefono : "",
    notas,
    source: String(body.source ?? "web").trim().toLowerCase(),
  };
}

/** Llama a una Edge Function de nexum con el token de agente del restaurante. */
async function nexum(fn: string, payload: Record<string, unknown>) {
  const base = Deno.env.get("NEXUM_URL");
  const token = Deno.env.get("NEXUM_AGENT_TOKEN");
  if (!base || !token) {
    return { ok: false, status: 500, data: { error: "nexum no configurado" } };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), NEXUM_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 504, data: { error: e instanceof Error ? e.message : "fallo de red" } };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Traduce la respuesta de nexum al vocabulario que ya entiende la landing.
 * nexum: { available, reason, message, alternatives? }
 */
function traducirDisponibilidad(v: Validado, d: Record<string, unknown>) {
  const disponible = d.available === true;
  const reason = String(d.reason ?? "");
  const alternativas = Array.isArray(d.alternatives) ? d.alternatives : [];

  let estado = "no_disponible";
  if (disponible) estado = "disponible";
  else if (reason === "party_too_large") estado = "grupo_grande";
  else if (alternativas.length > 0) estado = "alternativas";

  return {
    estado,
    fecha: v.fecha,
    hora: v.hora,
    invitados: v.invitados,
    turno: d.shift ?? null,
    mensaje: d.message ?? null,
    alternativas,
    motivo: reason,
  };
}

/** Dispara NEBOA-RESERVAS-SIDEFFECT. Nunca lanza: la reserva ya existe. */
async function dispararSideEffect(payload: Record<string, unknown>) {
  const url = Deno.env.get("N8N_SIDEEFFECT_URL");
  const jwt = Deno.env.get("N8N_JWT_SECRET");
  if (!url || !jwt) return { ok: false, error: "side effect no configurado" };

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

  if (!Deno.env.get("NEXUM_URL") || !Deno.env.get("NEXUM_AGENT_TOKEN")) {
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
    const r = await nexum("agent-check-availability", {
      date: v.fecha,
      time: v.hora,
      party_size: v.invitados,
    });
    if (!r.ok) {
      return json({ ok: false, error: "no se pudo consultar disponibilidad", detalle: r.data }, 502);
    }
    return json(traducirDisponibilidad(v, r.data));
  }

  // ---- CREATE ------------------------------------------------------------
  const r = await nexum("agent-create-reservation", {
    date: v.fecha,
    time: v.hora,
    party_size: v.invitados,
    phone: v.telefono,
    name: v.nombre,
    notes: v.notas || null,
    source: "web",
  });
  if (!r.ok) {
    return json({ ok: false, error: "no se pudo crear la reserva", detalle: r.data }, 502);
  }

  const d = r.data;

  // Rechazo de negocio: nexum contesta 200 con ok:false y un mensaje ya
  // redactado en castellano. Se traduce al mismo vocabulario que `check`.
  if (d.ok !== true || d.created !== true) {
    return json(traducirDisponibilidad(v, d));
  }

  const reserva = (d.reservation ?? {}) as Record<string, unknown>;
  const salida = {
    estado: "reserva_creada",
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
  };

  if (!WEB_SOURCES.has(v.source)) {
    return json({ ...salida, sideeffect: { ok: false, error: "source no web, side effect omitido" } });
  }

  const sideeffect = await dispararSideEffect({
    reserva_id: reserva.id,
    codigo: reserva.code ?? null,
    mesa: reserva.table_code ?? null,
    nombre: v.nombre,
    telefono: v.telefonoE164,
    fecha: v.fecha,
    hora: v.hora,
    invitados: v.invitados,
    notas: v.notas,
    turno: reserva.shift ?? null,
    source: v.source,
  });

  return json({ ...salida, sideeffect });
});
