/**
 * GET /api/admin/blog-stats
 * Estadísticas agregadas de TODO el blog (no de un artículo suelto), a partir
 * de la tabla articulos_views + la tabla articulos (títulos, cta_clicks).
 * Pensado para la sección "Blog" del dashboard de analytics.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { clasificarFuente } from "../../../../lib/fuenteTrafico";

const PRENSA_PREFIX = "__prensa__";

const SOURCE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT", claude: "Claude", grok: "Grok", gemini: "Gemini",
  perplexity: "Perplexity", copilot: "Copilot / Bing", duckduckgo: "DuckDuckGo",
  google: "Google", instagram: "Instagram", linkedin: "LinkedIn", x: "X / Twitter",
  facebook: "Facebook", whatsapp: "WhatsApp", tiktok: "TikTok", youtube: "YouTube",
  reddit: "Reddit", other: "Otra web externa",
};

const COUNTRY_LABELS: Record<string, string> = {
  ES: "España", PT: "Portugal", FR: "Francia", IT: "Italia", DE: "Alemania",
  GB: "Reino Unido", US: "Estados Unidos", MX: "México", AR: "Argentina",
  CO: "Colombia", CL: "Chile", PE: "Perú", VE: "Venezuela", EC: "Ecuador",
  MA: "Marruecos", RO: "Rumanía", NL: "Países Bajos", BE: "Bélgica", IE: "Irlanda",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "💻 Escritorio", mobile: "📱 Móvil", tablet: "📲 Tablet",
};

type Row = {
  slug: string;
  source: string;
  device: string | null;
  country: string | null;
  referrer: string | null;
  utm_source: string | null;
  visitor_hash: string | null;
  created_at: string;
};

function esDominioPropio(host: string): boolean {
  const h = host.replace(/^www\./, "");
  return h.includes("interroommurcia") || h.includes("inter-room-murcia");
}

/** Clasifica de dónde llega cada visita al artículo: interno (inicio, blog…) o externo. */
function clasificarEntrada(referrer: string | null, utmSource: string | null): string {
  if (referrer) {
    try {
      const u = new URL(referrer);
      if (esDominioPropio(u.hostname)) {
        const p = u.pathname;
        if (p === "/" || p === "") return "Desde la portada (inicio)";
        if (p.startsWith("/blog")) return "Desde el listado del blog";
        if (p.startsWith("/habitaciones") || p.startsWith("/catalogo")) return "Desde el catálogo / zonas";
        return "Desde otra página de la web";
      }
    } catch { /* referrer no parseable */ }
  }
  const f = clasificarFuente(referrer, utmSource);
  if (f === "direct") return "Directo (escriben la URL o la IA sin marcar)";
  return SOURCE_LABELS[f] ?? "Otra web externa";
}

function topBy(entries: Map<string, number>, labels: Record<string, string>, limit: number) {
  let total = 0;
  for (const v of entries.values()) total += v;
  return Array.from(entries.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, label: labels[key] ?? key, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
}

function bucketByDay(rows: Row[], days: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, views]) => ({ date, views }));
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();

  const [viewsRes, artsRes] = await Promise.all([
    supabaseAdmin
      .from("articulos_views")
      .select("slug, source, device, country, referrer, utm_source, visitor_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(20000),
    supabaseAdmin
      .from("articulos")
      .select("slug, h1, meta_title, views, cta_clicks, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const allRows = (viewsRes.data ?? []) as Row[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arts = (artsRes.data ?? []) as any[];

  // Separa clics de notas de prensa (slug sintético) del resto.
  const prensaRows = allRows.filter((r) => r.slug.startsWith(PRENSA_PREFIX));
  const viewRows = allRows.filter((r) => !r.slug.startsWith(PRENSA_PREFIX));
  const humanRows = viewRows.filter((r) => r.device !== "bot");

  // Únicos / recurrentes por visitor_hash.
  const hashCounts = new Map<string, number>();
  for (const r of humanRows) {
    if (r.visitor_hash) hashCounts.set(r.visitor_hash, (hashCounts.get(r.visitor_hash) ?? 0) + 1);
  }
  let unique = 0, returning = 0;
  for (const n of hashCounts.values()) { unique++; if (n > 1) returning++; }

  // Ranking de artículos: usa el contador agregado de la tabla articulos
  // (views/cta_clicks) y añade el título legible.
  const topArticles = arts
    .map((a) => ({
      slug: a.slug as string,
      title: (a.h1 || a.meta_title || a.slug) as string,
      views: Number(a.views ?? 0),
      ctaClicks: Number(a.cta_clicks ?? 0),
      ctr: Number(a.views) > 0 ? Math.round((Number(a.cta_clicks ?? 0) / Number(a.views)) * 100) : 0,
    }))
    .filter((a) => a.views > 0 || a.ctaClicks > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 30);

  const ctaClicksTotal = topArticles.reduce((s, a) => s + a.ctaClicks, 0);

  // De dónde entran al blog (interno vs externo).
  const entradasMap = new Map<string, number>();
  for (const r of humanRows) {
    const k = clasificarEntrada(r.referrer, r.utm_source);
    entradasMap.set(k, (entradasMap.get(k) ?? 0) + 1);
  }

  const devicesMap = new Map<string, number>();
  for (const r of humanRows) { const d = r.device || "desktop"; devicesMap.set(d, (devicesMap.get(d) ?? 0) + 1); }
  for (const fijo of ["desktop", "mobile", "tablet"]) if (!devicesMap.has(fijo)) devicesMap.set(fijo, 0);

  const countriesMap = new Map<string, number>();
  for (const r of humanRows) { if (r.country) countriesMap.set(r.country, (countriesMap.get(r.country) ?? 0) + 1); }

  // Clics en notas de prensa (por medio).
  const prensaMap = new Map<string, number>();
  for (const r of prensaRows) {
    const medio = r.slug.slice(PRENSA_PREFIX.length) || "prensa";
    prensaMap.set(medio, (prensaMap.get(medio) ?? 0) + 1);
  }

  return NextResponse.json({
    totals: {
      views: humanRows.length,
      unique,
      returning,
      newVisitors: unique - returning,
      bots: viewRows.length - humanRows.length,
      ctaClicks: ctaClicksTotal,
      articles: topArticles.length,
    },
    topArticles,
    entradas: topBy(entradasMap, {}, 12),
    devices: topBy(devicesMap, DEVICE_LABELS, 5),
    countries: topBy(countriesMap, COUNTRY_LABELS, 10),
    dailyViews: bucketByDay(humanRows, 30),
    prensa: Array.from(prensaMap.entries())
      .map(([medio, clicks]) => ({ medio, clicks }))
      .sort((a, b) => b.clicks - a.clicks),
  });
}
