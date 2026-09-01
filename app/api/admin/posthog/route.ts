/**
 * GET /api/admin/posthog?desde=2026-08-01&hasta=2026-08-31
 * Métricas de tráfico web desde PostHog via HogQL.
 * Si no se pasan fechas, usa últimos 30 días.
 * Siempre incluye realtime (últimos 5 min) independiente del periodo.
 */
import { NextRequest, NextResponse } from "next/server";

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

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: "POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID no configurados" }, { status: 503 });
  }

  const desde = req.nextUrl.searchParams.get("desde");
  const hasta = req.nextUrl.searchParams.get("hasta");

  let dateFilter: string;
  if (desde && hasta) {
    dateFilter = `timestamp >= '${desde}' AND timestamp <= '${hasta} 23:59:59'`;
  } else {
    dateFilter = `timestamp >= now() - INTERVAL 30 DAY`;
  }

  try {
    const [rStats, rTop, rDaily, rBounce, rSources, rDevices, rEntry, rUtm, rCountries, rRealtime, rClicks, rNewUsers, rReferrers, rPeakDaily, rNewVsReturn] =
      await Promise.all([
        hogql(`
        SELECT count() AS pageviews, uniqExact(distinct_id) AS visitors, uniqExact(properties.$session_id) AS sessions
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
      `),
        hogql(`
        SELECT replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path, count() AS views, uniqExact(distinct_id) AS uniq
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY path ORDER BY views DESC LIMIT 10
      `),
        hogql(`
        SELECT toDate(timestamp) AS day, count() AS pageviews, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY day ORDER BY day ASC
      `),
        hogql(`
        SELECT countIf(total = 1) AS bounced, count() AS total_sessions
        FROM (
          SELECT properties.$session_id AS sid, count() AS total
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
          GROUP BY sid
        )
      `),
        hogql(`
        SELECT if(properties.$referring_domain IS NULL OR properties.$referring_domain = '', '(directo)', properties.$referring_domain) AS source,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY source ORDER BY visits DESC LIMIT 15
      `),
        hogql(`
        SELECT if(properties.$device_type IS NULL OR properties.$device_type = '', 'Unknown', properties.$device_type) AS device,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY device ORDER BY visits DESC
      `),
        hogql(`
        SELECT replaceRegexpOne(first_url, 'https?://[^/]+', '') AS entry_path, count() AS sessions
        FROM (
          SELECT properties.$session_id AS sid, argMin(properties.$current_url, timestamp) AS first_url
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
          GROUP BY sid
        )
        GROUP BY entry_path ORDER BY sessions DESC LIMIT 8
      `),
        hogql(`
        SELECT if(properties.utm_source IS NULL OR properties.utm_source = '', '(sin UTM)', properties.utm_source) AS utm_source,
          if(properties.utm_medium IS NULL OR properties.utm_medium = '', '', properties.utm_medium) AS utm_medium,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY utm_source, utm_medium ORDER BY visits DESC LIMIT 12
      `),
        hogql(`
        SELECT if(properties.$geoip_country_name IS NULL OR properties.$geoip_country_name = '', 'Unknown', properties.$geoip_country_name) AS country,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY country ORDER BY visits DESC LIMIT 10
      `),
        // Realtime siempre últimos 5 min
        hogql(`
        SELECT replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path, uniqExact(distinct_id) AS active_users
        FROM events WHERE timestamp >= now() - INTERVAL 5 MINUTE AND ${DOMAIN_FILTER}
        GROUP BY path ORDER BY active_users DESC LIMIT 10
      `),
        hogql(`
        SELECT coalesce(nullIf(trim(properties.$el_text), ''), '[sin texto]') AS element, count() AS clicks, uniqExact(distinct_id) AS unique_users
        FROM events WHERE event = '$autocapture' AND properties.$event_type = 'click'
          AND properties.$current_url NOT LIKE '%/admin%'
          AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY element HAVING element != '[sin texto]' ORDER BY clicks DESC LIMIT 15
      `),
        hogql(`
        SELECT toDate(first_seen) AS day, count() AS new_users
        FROM (
          SELECT distinct_id, min(timestamp) AS first_seen
          FROM events WHERE event = '$pageview' AND ${DOMAIN_FILTER}
          GROUP BY distinct_id
          HAVING ${desde && hasta ? `first_seen >= '${desde}' AND first_seen <= '${hasta} 23:59:59'` : `first_seen >= now() - INTERVAL 30 DAY`}
        )
        GROUP BY day ORDER BY day ASC
      `),
        hogql(`
        SELECT if(properties.$referrer IS NULL OR properties.$referrer = '' OR properties.$referrer = '$direct', '(directo)', properties.$referrer) AS referrer,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY referrer ORDER BY visits DESC LIMIT 20
      `),
        hogql(`
        SELECT day, max(concurrent) AS peak
        FROM (
          SELECT toDate(timestamp) AS day, toStartOfHour(timestamp) AS hour, uniqExact(distinct_id) AS concurrent
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
          GROUP BY day, hour
        )
        GROUP BY day ORDER BY day ASC
      `),
        // Nuevos vs recurrentes por día
        hogql(`
        SELECT toDate(e.timestamp) AS day,
          uniqExactIf(e.distinct_id, f.first_seen >= ${desde ? `'${desde}'` : `now() - INTERVAL 30 DAY`}) AS new_users,
          uniqExactIf(e.distinct_id, f.first_seen < ${desde ? `'${desde}'` : `now() - INTERVAL 30 DAY`}) AS returning_users
        FROM events AS e
        INNER JOIN (
          SELECT distinct_id, min(timestamp) AS first_seen
          FROM events WHERE event = '$pageview' AND ${DOMAIN_FILTER}
          GROUP BY distinct_id
        ) AS f ON e.distinct_id = f.distinct_id
        WHERE e.event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER}
        GROUP BY day ORDER BY day ASC
      `),
      ]);

    const s = rStats.results?.[0] ?? [0, 0, 0];
    const sb = rBounce.results?.[0] ?? [0, 1];

    const newUsersDaily = (rNewUsers.results ?? []).map((r: unknown[]) => ({ day: String(r[0]), newUsers: Number(r[1]) }));
    const totalNewUsers = newUsersDaily.reduce((sum: number, d: { newUsers: number }) => sum + d.newUsers, 0);

    return NextResponse.json({
      stats: { pageviews: Number(s[0]), visitors: Number(s[1]), sessions: Number(s[2]) },
      bounceRate: sb[1] > 0 ? Math.round((Number(sb[0]) / Number(sb[1])) * 100) : 0,
      totalNewUsers,
      topPages: (rTop.results ?? []).map((r: unknown[]) => ({ path: String(r[0] || "/"), views: Number(r[1]), uniq: Number(r[2]) })),
      dailyViews: (rDaily.results ?? []).map((r: unknown[]) => ({ day: String(r[0]), pageviews: Number(r[1]), visitors: Number(r[2]) })),
      sources: (rSources.results ?? []).map((r: unknown[]) => ({ source: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]) })),
      devices: (rDevices.results ?? []).map((r: unknown[]) => ({ device: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]) })),
      entryPages: (rEntry.results ?? []).map((r: unknown[]) => ({ path: String(r[0] || "/"), sessions: Number(r[1]) })),
      utmSources: (rUtm.results ?? []).map((r: unknown[]) => ({ source: String(r[0]), medium: String(r[1]), visits: Number(r[2]), visitors: Number(r[3]) })),
      countries: (rCountries.results ?? []).map((r: unknown[]) => ({ country: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]) })),
      realtime: (rRealtime.results ?? []).map((r: unknown[]) => ({ path: String(r[0] || "/"), active: Number(r[1]) })),
      clicks: (rClicks.results ?? []).map((r: unknown[]) => ({ element: String(r[0]), clicks: Number(r[1]), users: Number(r[2]) })),
      newUsersDaily,
      referrers: (rReferrers.results ?? []).map((r: unknown[]) => ({ url: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]) })),
      peakConcurrentDaily: (rPeakDaily.results ?? []).map((r: unknown[]) => ({ day: String(r[0]), peak: Number(r[1]) })),
      newVsReturn: (rNewVsReturn.results ?? []).map((r: unknown[]) => ({ day: String(r[0]), newUsers: Number(r[1]), returning: Number(r[2]) })),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[posthog api]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
