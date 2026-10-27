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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hogql(query: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${PH_API}/api/projects/${PH_PROJ}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PH_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    });
    if (res.ok) return res.json();
    if (res.status >= 500 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    const txt = await res.text();
    throw new Error(`PostHog ${res.status}: ${txt.slice(0, 300)}`);
  }
  throw new Error("PostHog: reintentos agotados");
}

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: "POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID no configurados" }, { status: 503 });
  }

  const desde = req.nextUrl.searchParams.get("desde");
  const hasta = req.nextUrl.searchParams.get("hasta");
  const excluirAdmin = req.nextUrl.searchParams.get("excluirAdmin") === "1";

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  let dateFilter: string;
  if (desde && hasta && dateRe.test(desde) && dateRe.test(hasta)) {
    dateFilter = `timestamp >= '${desde}' AND timestamp <= '${hasta} 23:59:59'`;
  } else {
    dateFilter = `timestamp >= now() - INTERVAL 30 DAY`;
  }

  const adminFilter = excluirAdmin
    ? `AND properties.$current_url NOT LIKE '%/admin%' AND coalesce(toString(person.properties.es_interno), '') != 'true'`
    : "";

  try {
    // Lote 1: queries ligeras
    const [rStats, rTop, rDaily, rBounce, rSources, rDevices, rEntry, rUtm] =
      await Promise.all([
        hogql(`
        SELECT count() AS pageviews, uniqExact(distinct_id) AS visitors, uniqExact(properties.$session_id) AS sessions
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
      `),
        hogql(`
        SELECT replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path, count() AS views, uniqExact(distinct_id) AS uniq
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY path ORDER BY views DESC LIMIT 10
      `),
        hogql(`
        SELECT toDate(timestamp) AS day, count() AS pageviews, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY day ORDER BY day ASC
      `),
        hogql(`
        SELECT countIf(total = 1) AS bounced, count() AS total_sessions
        FROM (
          SELECT properties.$session_id AS sid, count() AS total
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
          GROUP BY sid
        )
      `),
        hogql(`
        SELECT if(properties.$referring_domain IS NULL OR properties.$referring_domain = '', '(directo)', properties.$referring_domain) AS source,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY source ORDER BY visits DESC LIMIT 15
      `),
        hogql(`
        SELECT if(properties.$device_type IS NULL OR properties.$device_type = '', 'Unknown', properties.$device_type) AS device,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY device ORDER BY visits DESC
      `),
        hogql(`
        SELECT replaceRegexpOne(first_url, 'https?://[^/]+', '') AS entry_path, count() AS sessions
        FROM (
          SELECT properties.$session_id AS sid, argMin(properties.$current_url, timestamp) AS first_url
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
          GROUP BY sid
        )
        GROUP BY entry_path ORDER BY sessions DESC LIMIT 8
      `),
        hogql(`
        SELECT if(properties.utm_source IS NULL OR properties.utm_source = '', '(sin UTM)', properties.utm_source) AS utm_source,
          if(properties.utm_medium IS NULL OR properties.utm_medium = '', '', properties.utm_medium) AS utm_medium,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY utm_source, utm_medium ORDER BY visits DESC LIMIT 12
      `),
      ]);

    // Lote 2: queries pesadas (subqueries, JOINs, autocapture)
    const [rCountries, rRealtime, rClicks, rNewUsers, rReferrers, rPeakDaily, rNewVsReturn, rSessionDuration] =
      await Promise.all([
        hogql(`
        SELECT if(properties.$geoip_country_name IS NULL OR properties.$geoip_country_name = '', 'Unknown', properties.$geoip_country_name) AS country,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY country ORDER BY visits DESC LIMIT 10
      `),
        hogql(`
        SELECT replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path, uniqExact(distinct_id) AS active_users
        FROM events WHERE timestamp >= now() - INTERVAL 5 MINUTE AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY path ORDER BY active_users DESC LIMIT 10
      `),
        hogql(`
        SELECT coalesce(nullIf(trim(properties.$el_text), ''), '[sin texto]') AS element, count() AS clicks, uniqExact(distinct_id) AS unique_users
        FROM events WHERE event = '$autocapture' AND properties.$event_type = 'click'
          AND properties.$current_url NOT LIKE '%/admin%'
          AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY element HAVING element != '[sin texto]' ORDER BY clicks DESC LIMIT 15
      `),
        hogql(`
        SELECT toDate(first_seen) AS day, count() AS new_users
        FROM (
          SELECT distinct_id, min(timestamp) AS first_seen
          FROM events WHERE event = '$pageview' AND ${DOMAIN_FILTER} ${adminFilter}
            AND timestamp >= now() - INTERVAL 1 YEAR
          GROUP BY distinct_id
          HAVING ${desde && hasta && dateRe.test(desde) && dateRe.test(hasta) ? `first_seen >= '${desde}' AND first_seen <= '${hasta} 23:59:59'` : `first_seen >= now() - INTERVAL 30 DAY`}
        )
        GROUP BY day ORDER BY day ASC
      `),
        hogql(`
        SELECT if(properties.$referrer IS NULL OR properties.$referrer = '' OR properties.$referrer = '$direct', '(directo)', properties.$referrer) AS referrer,
          count() AS visits, uniqExact(distinct_id) AS visitors
        FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY referrer ORDER BY visits DESC LIMIT 20
      `),
        hogql(`
        SELECT day, max(concurrent) AS peak
        FROM (
          SELECT toDate(timestamp) AS day, toStartOfHour(timestamp) AS hour, uniqExact(distinct_id) AS concurrent
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
          GROUP BY day, hour
        )
        GROUP BY day ORDER BY day ASC
      `),
        hogql(`
        SELECT toDate(e.timestamp) AS day,
          uniqExactIf(e.distinct_id, f.first_seen >= ${desde && dateRe.test(desde) ? `'${desde}'` : `now() - INTERVAL 30 DAY`}) AS new_users,
          uniqExactIf(e.distinct_id, f.first_seen < ${desde && dateRe.test(desde) ? `'${desde}'` : `now() - INTERVAL 30 DAY`}) AS returning_users
        FROM events AS e
        INNER JOIN (
          SELECT distinct_id AS did, min(timestamp) AS first_seen
          FROM events WHERE event = '$pageview' AND ${DOMAIN_FILTER} ${adminFilter}
            AND timestamp >= now() - INTERVAL 1 YEAR
          GROUP BY did
        ) AS f ON e.distinct_id = f.did
        WHERE e.event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY day ORDER BY day ASC
      `),
        hogql(`
        SELECT avg(duration) AS avg_duration, avg(pages) AS avg_pages
        FROM (
          SELECT properties.$session_id AS sid,
            dateDiff('second', min(timestamp), max(timestamp)) AS duration,
            count() AS pages
          FROM events WHERE event = '$pageview' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
          GROUP BY sid HAVING pages > 1
        )
      `),
      ]);

    // Lote 3: métricas específicas de /venta (funnel + exit intent + scroll + conv-by-source)
    const [rVentaCounts, rVentaScroll, rVentaExit, rVentaConvSource, rVentaCalc] =
      await Promise.all([
        // Pageviews a /venta y conteos de los eventos custom que disparamos
        // en el flujo (step1, submit, whatsapp clicks).
        hogql(`
        SELECT
          countIf(event = '$pageview' AND properties.$current_url LIKE '%/venta%') AS pv,
          uniqExactIf(distinct_id, event = '$pageview' AND properties.$current_url LIKE '%/venta%') AS visitors,
          countIf(event = 'venta_form_step1_done') AS step1,
          countIf(event = 'venta_form_submit') AS submits,
          countIf(event = 'venta_whatsapp_click') AS wa_clicks,
          countIf(event = 'venta_calc_use') AS calc_uses
        FROM events
        WHERE ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
      `),
        // Distribución de scroll depth en /venta (cuántos llegan a cada umbral)
        hogql(`
        SELECT toInt(properties.depth) AS depth,
          count() AS hits,
          uniqExact(distinct_id) AS users
        FROM events
        WHERE event = 'scroll_depth' AND properties.page = 'venta'
          AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY depth ORDER BY depth ASC
      `),
        // Exit intent efectividad (shown/closed/submit/dwell/abandoned + next page)
        hogql(`
        SELECT
          countIf(event = 'venta_exit_intent_shown') AS shown,
          countIf(event = 'venta_exit_intent_closed') AS closed,
          countIf(event = 'venta_exit_intent_submit') AS submitted,
          uniqExactIf(distinct_id, event = 'venta_exit_intent_shown') AS unique_shown,
          countIf(event = 'venta_exit_intent_dwell_10s') AS dwell_10s,
          countIf(event = 'venta_exit_intent_abandoned') AS abandoned,
          countIf(event = 'venta_exit_intent_abandoned' AND properties.dwell_more_than_10s = true) AS abandoned_after_10s,
          avgIf(toFloat(properties.dwell_ms), event = 'venta_exit_intent_closed' AND properties.dwell_ms IS NOT NULL) AS avg_close_ms
        FROM events
        WHERE ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
      `),
        // Fuente de los que convierten (envían el form de /venta)
        hogql(`
        SELECT if(properties.referring_domain IS NULL OR properties.referring_domain = '', '(directo)', properties.referring_domain) AS source,
          count() AS conversions,
          uniqExact(distinct_id) AS users
        FROM events
        WHERE event = 'venta_form_submit' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
        GROUP BY source ORDER BY conversions DESC LIMIT 10
      `),
        // Precios con los que juega la gente en la calculadora de ahorro
        hogql(`
        SELECT
          avg(toFloat(properties.precio)) AS avg_precio,
          median(toFloat(properties.precio)) AS median_precio,
          avg(toFloat(properties.ahorro)) AS avg_ahorro,
          count() AS uses
        FROM events
        WHERE event = 'venta_calc_use' AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
      `),
      ]);

    // A dónde van después de ver el exit intent (si no convirtieron)
    const rVentaNextPage = await hogql(`
      SELECT properties.next_page AS next_page, count() AS visits
      FROM events
      WHERE event = 'venta_exit_intent_next_page'
        AND ${dateFilter} AND ${DOMAIN_FILTER} ${adminFilter}
      GROUP BY next_page ORDER BY visits DESC LIMIT 10
    `);

    const s = rStats.results?.[0] ?? [0, 0, 0];
    const sb = rBounce.results?.[0] ?? [0, 1];
    const sd = rSessionDuration.results?.[0] ?? [0, 0];

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
      avgSessionDuration: Math.round(Number(sd[0])),
      avgPagesPerSession: Math.round(Number(sd[1]) * 10) / 10,
      venta: (() => {
        const v = rVentaCounts.results?.[0] ?? [0, 0, 0, 0, 0, 0];
        const e = rVentaExit.results?.[0] ?? [0, 0, 0, 0];
        const c = rVentaCalc.results?.[0] ?? [0, 0, 0, 0];
        return {
          pageviews: Number(v[0]),
          visitors: Number(v[1]),
          step1: Number(v[2]),
          submits: Number(v[3]),
          waClicks: Number(v[4]),
          calcUses: Number(v[5]),
          scroll: (rVentaScroll.results ?? []).map((r: unknown[]) => ({
            depth: Number(r[0]),
            hits: Number(r[1]),
            users: Number(r[2]),
          })),
          exitIntent: {
            shown: Number(e[0]),
            closed: Number(e[1]),
            submitted: Number(e[2]),
            uniqueShown: Number(e[3]),
            dwell10s: Number(e[4] ?? 0),
            abandoned: Number(e[5] ?? 0),
            abandonedAfter10s: Number(e[6] ?? 0),
            avgCloseMs: Math.round(Number(e[7] ?? 0)),
            nextPages: (rVentaNextPage.results ?? []).map((r: unknown[]) => ({
              page: String(r[0] || "/"),
              visits: Number(r[1]),
            })),
          },
          convBySource: (rVentaConvSource.results ?? []).map((r: unknown[]) => ({
            source: String(r[0]),
            conversions: Number(r[1]),
            users: Number(r[2]),
          })),
          calc: {
            avgPrecio: Math.round(Number(c[0]) || 0),
            medianPrecio: Math.round(Number(c[1]) || 0),
            avgAhorro: Math.round(Number(c[2]) || 0),
            uses: Number(c[3]),
          },
        };
      })(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    console.error("[posthog api]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
