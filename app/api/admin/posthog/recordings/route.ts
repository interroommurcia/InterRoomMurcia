/**
 * GET /api/admin/posthog/recordings?limit=20&path=/venta&convertidos=1
 *
 * Lista grabaciones de sesión recientes de PostHog con metadata útil
 * (duración, páginas visitadas, device, país, si convirtió, exit intent).
 * No baja los eventos rrweb completos — solo la ficha de cada sesión
 * para pintarla en el admin. El visor real se abre con el share token.
 */
import { NextRequest, NextResponse } from "next/server";

const PH_API = "https://eu.posthog.com";
const PH_KEY = process.env.POSTHOG_PERSONAL_API_KEY ?? "";
const PH_PROJ = process.env.POSTHOG_PROJECT_ID ?? "";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Recording = {
  // La API de PostHog devuelve el identificador de la grabación en `id`
  // (antes se asumía `session_id`, que no existe en la respuesta).
  id: string;
  session_id?: string;
  start_time: string;
  end_time: string;
  recording_duration: number;
  distinct_id: string;
  active_seconds?: number;
  click_count?: number;
  keypress_count?: number;
  mouse_activity_count?: number;
  console_error_count?: number;
  start_url?: string;
  first_url?: string;
  person?: { properties?: Record<string, unknown> } | null;
};

function fmtPlayerUrl(sessionId: string): string {
  return `${PH_API}/project/${PH_PROJ}/replay/${sessionId}`;
}

export async function GET(req: NextRequest) {
  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: "POSTHOG_PERSONAL_API_KEY o POSTHOG_PROJECT_ID no configurados" }, { status: 503 });
  }

  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 20)), 100);
  const pathFilter = req.nextUrl.searchParams.get("path") || "";
  const soloConvertidos = req.nextUrl.searchParams.get("convertidos") === "1";

  try {
    // 1. Lista de grabaciones recientes (orden por hora de inicio desc)
    const params = new URLSearchParams({
      limit: String(limit),
      offset: "0",
      order: "start_time",
    });
    // Filtro opcional por path visitado
    if (pathFilter) {
      params.set(
        "properties",
        JSON.stringify([{ key: "$current_url", value: pathFilter, operator: "icontains", type: "event" }]),
      );
    }

    const listRes = await fetch(
      `${PH_API}/api/projects/${PH_PROJ}/session_recordings/?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${PH_KEY}` },
        cache: "no-store",
      },
    );
    if (!listRes.ok) {
      const txt = await listRes.text();
      if (listRes.status === 403 && /session_recording/i.test(txt)) {
        return NextResponse.json(
          {
            error:
              "La API key de PostHog no tiene permiso para leer grabaciones. Entra en PostHog → Personal API keys, edita la key y añade el scope 'session_recording:read' (y 'query:read' si no lo tiene). Después recarga esta página.",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: `PostHog ${listRes.status}: ${txt.slice(0, 300)}` }, { status: 502 });
    }
    const list = (await listRes.json()) as { results?: Recording[] };
    const rec = list.results ?? [];

    // 2. Cruzar con eventos custom: para cada sesión miramos si convirtió
    //    o vio el exit intent en el período que cubren.
    const ids = rec.map((r) => r.id ?? r.session_id).filter(Boolean);
    const conversionsBySid = new Map<string, { converted: boolean; exitShown: boolean; exitAction?: string }>();
    // Sesiones de visitantes marcados como internos (yo): se ocultan del listado.
    const internosSids = new Set<string>();
    if (ids.length) {
      const idList = ids.map((id) => `'${id.replace(/'/g, "")}'`).join(",");
      const q = `
        SELECT properties.$session_id AS sid,
          countIf(event = 'venta_form_submit' OR event = 'venta_exit_intent_submit') AS converted,
          countIf(event = 'venta_exit_intent_shown') AS exit_shown,
          anyIf(event, event IN ('venta_exit_intent_closed','venta_exit_intent_submit','venta_exit_intent_abandoned','venta_exit_intent_dwell_10s')) AS exit_action,
          max(if(person.properties.es_interno = 'true', 1, 0)) AS interno
        FROM events
        WHERE properties.$session_id IN (${idList})
        GROUP BY sid
      `;
      try {
        const hRes = await fetch(`${PH_API}/api/projects/${PH_PROJ}/query/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${PH_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: { kind: "HogQLQuery", query: q } }),
          cache: "no-store",
        });
        if (hRes.ok) {
          const h = (await hRes.json()) as { results?: unknown[][] };
          for (const row of h.results ?? []) {
            const sid = String(row[0]);
            conversionsBySid.set(sid, {
              converted: Number(row[1]) > 0,
              exitShown: Number(row[2]) > 0,
              exitAction: row[3] ? String(row[3]) : undefined,
            });
            if (Number(row[4]) > 0) internosSids.add(sid);
          }
        }
      } catch {
        /* no bloquea la respuesta si falla el cruce */
      }
    }

    // 3. Enriquecer y filtrar
    let enriched = rec.map((r) => {
      const sid = r.id ?? r.session_id ?? "";
      const conv = conversionsBySid.get(sid) ?? { converted: false, exitShown: false };
      const props = (r.person?.properties ?? {}) as Record<string, unknown>;
      return {
        session_id: sid,
        start_time: r.start_time,
        end_time: r.end_time,
        duration_sec: Math.round(Number(r.recording_duration) || 0),
        active_sec: Math.round(Number(r.active_seconds) || 0),
        clicks: Number(r.click_count) || 0,
        keypresses: Number(r.keypress_count) || 0,
        start_url: r.first_url || r.start_url || "",
        country: (props.$geoip_country_name as string) || "",
        country_code: (props.$geoip_country_code as string) || "",
        region: (props.$geoip_subdivision_1_name as string) || "",
        city: (props.$geoip_city_name as string) || "",
        device: (props.$device_type as string) || "",
        browser: (props.$browser as string) || "",
        os: (props.$os as string) || "",
        referrer_domain: (props.$initial_referring_domain as string) || "",
        converted: conv.converted,
        exit_intent_shown: conv.exitShown,
        exit_intent_action: conv.exitAction || "",
        player_url: fmtPlayerUrl(sid),
      };
    });

    // Oculta las sesiones de visitantes internos (marcadas con "No grabar mis visitas").
    enriched = enriched.filter((r) => !internosSids.has(r.session_id));

    if (soloConvertidos) enriched = enriched.filter((r) => r.converted);

    return NextResponse.json({ recordings: enriched });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("[posthog recordings]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
