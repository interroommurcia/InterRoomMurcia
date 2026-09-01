/**
 * GET  /api/admin/analytics-history?anio=2026  → snapshots del año
 * POST /api/admin/analytics-history             → guardar snapshot del mes actual (o body.mes = "2026-08")
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const PH_API = "https://eu.posthog.com";
const PH_KEY = process.env.POSTHOG_PERSONAL_API_KEY ?? "";
const PH_PROJ = process.env.POSTHOG_PROJECT_ID ?? "";
const DOMAIN_FILTER =
  "(properties.$current_url LIKE '%inter-room-murcia%' OR properties.$current_url LIKE '%interroommurcia%')";

async function hogql(query: string) {
  const res = await fetch(`${PH_API}/api/projects/${PH_PROJ}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PH_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PostHog ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  const anio = req.nextUrl.searchParams.get("anio") || new Date().getFullYear().toString();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("analytics_monthly")
    .select("*")
    .gte("mes", `${anio}-01`)
    .lte("mes", `${anio}-12`)
    .order("mes", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ anio, meses: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: "PostHog no configurado" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const mesTarget = String(body.mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const match = mesTarget.match(/^(\d{4})-(\d{2})$/);
  if (!match) return NextResponse.json({ error: "Formato mes inválido (YYYY-MM)" }, { status: 400 });

  const [, yyyy, mm] = match;
  const startDate = `${yyyy}-${mm}-01`;
  const endDate = `${yyyy}-${mm}-${new Date(Number(yyyy), Number(mm), 0).getDate()}`;
  const interval = `timestamp >= '${startDate}' AND timestamp <= '${endDate} 23:59:59'`;

  try {
    const [rStats, rNewUsers, rPeak, rSources, rCountries, rDevices, rTopPages, rDaily, rBounce] =
      await Promise.all([
        hogql(`
          SELECT count() AS pageviews, uniqExact(distinct_id) AS visitors, uniqExact(properties.$session_id) AS sessions
          FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
        `),
        hogql(`
          SELECT count() AS new_users FROM (
            SELECT distinct_id, min(timestamp) AS first_seen
            FROM events WHERE event = '$pageview' AND ${DOMAIN_FILTER}
            GROUP BY distinct_id
            HAVING first_seen >= '${startDate}' AND first_seen <= '${endDate} 23:59:59'
          )
        `),
        hogql(`
          SELECT max(concurrent) AS peak FROM (
            SELECT toStartOfHour(timestamp) AS hour, uniqExact(distinct_id) AS concurrent
            FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
            GROUP BY hour
          )
        `),
        hogql(`
          SELECT if(properties.$referring_domain IS NULL OR properties.$referring_domain = '', '(directo)', properties.$referring_domain) AS source,
            count() AS visits
          FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
          GROUP BY source ORDER BY visits DESC LIMIT 10
        `),
        hogql(`
          SELECT if(properties.$geoip_country_name IS NULL OR properties.$geoip_country_name = '', 'Unknown', properties.$geoip_country_name) AS country,
            count() AS visits
          FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
          GROUP BY country ORDER BY visits DESC LIMIT 10
        `),
        hogql(`
          SELECT if(properties.$device_type IS NULL OR properties.$device_type = '', 'Unknown', properties.$device_type) AS device,
            count() AS visits
          FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
          GROUP BY device ORDER BY visits DESC
        `),
        hogql(`
          SELECT replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path, count() AS views
          FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
          GROUP BY path ORDER BY views DESC LIMIT 10
        `),
        hogql(`
          SELECT toDate(timestamp) AS day, count() AS pageviews, uniqExact(distinct_id) AS visitors
          FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
          GROUP BY day ORDER BY day ASC
        `),
        hogql(`
          SELECT countIf(total = 1) AS bounced, count() AS total_sessions FROM (
            SELECT properties.$session_id AS sid, count() AS total
            FROM events WHERE event = '$pageview' AND ${interval} AND ${DOMAIN_FILTER}
            GROUP BY sid
          )
        `),
      ]);

    const stats = rStats.results?.[0] ?? [0, 0, 0];
    const bounce = rBounce.results?.[0] ?? [0, 1];

    // Leads del mes
    const admin = getSupabaseAdmin();
    const { count: leadsCount } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate)
      .lte("created_at", `${endDate}T23:59:59`);

    const snapshot = {
      mes: mesTarget,
      pageviews: Number(stats[0]),
      visitors: Number(stats[1]),
      sessions: Number(stats[2]),
      new_users: Number(rNewUsers.results?.[0]?.[0] ?? 0),
      bounce_rate: bounce[1] > 0 ? Math.round((Number(bounce[0]) / Number(bounce[1])) * 100) : 0,
      peak_concurrent: Number(rPeak.results?.[0]?.[0] ?? 0),
      leads: leadsCount ?? 0,
      top_sources: (rSources.results ?? []).map((r: unknown[]) => ({ source: String(r[0]), visits: Number(r[1]) })),
      top_countries: (rCountries.results ?? []).map((r: unknown[]) => ({ country: String(r[0]), visits: Number(r[1]) })),
      top_pages: (rTopPages.results ?? []).map((r: unknown[]) => ({ path: String(r[0] || "/"), views: Number(r[1]) })),
      devices: (rDevices.results ?? []).map((r: unknown[]) => ({ device: String(r[0]), visits: Number(r[1]) })),
      daily_data: (rDaily.results ?? []).map((r: unknown[]) => ({ day: String(r[0]), pageviews: Number(r[1]), visitors: Number(r[2]) })),
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("analytics_monthly")
      .upsert(snapshot, { onConflict: "mes" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, mes: mesTarget, snapshot });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
