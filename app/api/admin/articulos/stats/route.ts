import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

const SOURCE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  grok: "Grok",
  gemini: "Gemini",
  perplexity: "Perplexity",
  copilot: "Copilot / Bing",
  duckduckgo: "DuckDuckGo",
  google: "Google",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  youtube: "YouTube",
  reddit: "Reddit",
  direct: "Directo / sin referrer",
  other: "Otro",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Escritorio",
  mobile: "Móvil",
  tablet: "Tablet",
  bot: "Bots / crawlers",
};

const COUNTRY_LABELS: Record<string, string> = {
  ES: "España",
  PT: "Portugal",
  FR: "Francia",
  IT: "Italia",
  DE: "Alemania",
  GB: "Reino Unido",
  US: "Estados Unidos",
  MX: "México",
  AR: "Argentina",
  CO: "Colombia",
  CL: "Chile",
  PE: "Perú",
  VE: "Venezuela",
  EC: "Ecuador",
  UY: "Uruguay",
  BR: "Brasil",
  MA: "Marruecos",
  RO: "Rumanía",
  NL: "Países Bajos",
  BE: "Bélgica",
  IE: "Irlanda",
  CH: "Suiza",
};

type Row = {
  source: string;
  device: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visitor_hash: string | null;
  created_at: string;
};

function bucketByDay(rows: Row[], days: number): { date: string; views: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, views]) => ({ date, views }));
}

function topBy<T extends keyof Row>(
  rows: Row[],
  field: T,
  labels: Record<string, string> = {},
  limit = 10,
): { key: string; label: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const raw = r[field];
    if (!raw) continue;
    const key = String(raw);
    counts[key] = (counts[key] ?? 0) + 1;
    total++;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({
      key,
      label: labels[key] ?? key,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("articulos_views")
    .select("source, device, country, city, referrer, utm_source, utm_medium, utm_campaign, visitor_hash, created_at")
    .eq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = (data ?? []) as Row[];
  const humanRows = rows.filter((r) => r.device !== "bot");

  // Únicos y recurrentes basados en visitor_hash.
  // Un visitor_hash es nuevo si solo aparece en una fila de todo el histórico leído.
  const hashCounts = new Map<string, number>();
  for (const r of humanRows) {
    if (!r.visitor_hash) continue;
    hashCounts.set(r.visitor_hash, (hashCounts.get(r.visitor_hash) ?? 0) + 1);
  }
  let uniqueVisitors = 0;
  let returning = 0;
  for (const n of hashCounts.values()) {
    uniqueVisitors++;
    if (n > 1) returning++;
  }

  // Primera visita de cada hash → cuándo entró por primera vez.
  const firstSeen = new Map<string, string>();
  for (const r of [...humanRows].reverse()) {
    if (r.visitor_hash && !firstSeen.has(r.visitor_hash)) firstSeen.set(r.visitor_hash, r.created_at);
  }

  const sources = topBy(humanRows, "source", SOURCE_LABELS, 15);
  const devices = topBy(humanRows, "device", DEVICE_LABELS, 4);
  const countries = topBy(humanRows, "country", COUNTRY_LABELS, 10);
  const cities = topBy(humanRows, "city", {}, 10);
  const utmCampaigns = topBy(humanRows, "utm_campaign", {}, 10);
  const utmSources = topBy(humanRows, "utm_source", {}, 10);

  // Dominios de referrer legibles (para ver webs concretas aparte de la fuente).
  const referrerCounts: Record<string, number> = {};
  for (const r of humanRows) {
    if (!r.referrer) continue;
    try {
      const host = new URL(r.referrer).hostname.replace(/^www\./, "");
      if (!host) continue;
      referrerCounts[host] = (referrerCounts[host] ?? 0) + 1;
    } catch {
      /* ignore */
    }
  }
  const referrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, label: key, count, pct: humanRows.length > 0 ? Math.round((count / humanRows.length) * 100) : 0 }));

  const dailyViews = bucketByDay(humanRows, 30);

  const totalHuman = humanRows.length;
  const botCount = rows.length - totalHuman;

  // Legacy format (sources + total) para mantener compatibilidad si lo lee algo más.
  const legacySources = sources.map((s) => ({ label: s.label, count: s.count }));

  return NextResponse.json({
    total: totalHuman,
    unique: uniqueVisitors,
    returning,
    newVisitors: uniqueVisitors - returning,
    bots: botCount,
    sources,
    devices,
    countries,
    cities,
    referrers,
    utmCampaigns,
    utmSources,
    dailyViews,
    // compat con la UI anterior:
    sourcesLegacy: legacySources,
  });
}
