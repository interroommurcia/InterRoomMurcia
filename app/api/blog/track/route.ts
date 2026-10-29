import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getClientIp } from "../../../../lib/security";
import { clasificarFuente } from "../../../../lib/fuenteTrafico";

const trackRateMap = new Map<string, { count: number; resetAt: number }>();
const TRACK_LIMIT = 100;
const TRACK_WINDOW = 60 * 60 * 1000;

function detectDevice(ua: string | null): "mobile" | "tablet" | "desktop" | "bot" {
  if (!ua) return "desktop";
  const u = ua.toLowerCase();
  if (/bot|crawler|spider|crawling|slurp|googlebot|bingbot|duckduckbot|yandex|baiduspider|facebookexternalhit|chatgpt-user|gptbot|oai-searchbot/i.test(u)) {
    return "bot";
  }
  if (/ipad|tablet|kindle|playbook|silk/i.test(u)) return "tablet";
  if (/mobi|android|iphone|ipod|windows phone|blackberry/i.test(u)) return "mobile";
  return "desktop";
}

function parseUrl(href: string | null): { path: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
  const empty = { path: "", utm_source: null, utm_medium: null, utm_campaign: null };
  if (!href) return empty;
  try {
    const u = new URL(href);
    return {
      path: u.pathname + (u.search || ""),
      utm_source: u.searchParams.get("utm_source"),
      utm_medium: u.searchParams.get("utm_medium"),
      utm_campaign: u.searchParams.get("utm_campaign"),
    };
  } catch {
    return empty;
  }
}

// Hash estable por visitante durante un día (ip + ua + día + salt).
// Permite contar únicos y detectar recurrentes sin almacenar la IP.
function visitorHash(ip: string, ua: string | null): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.NEXTAUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "ir-blog";
  return createHash("sha256").update(`${ip}|${ua ?? ""}|${day}|${salt}`).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || "unknown";
  const now = Date.now();
  const entry = trackRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    trackRateMap.set(ip, { count: 1, resetAt: now + TRACK_WINDOW });
  } else {
    entry.count++;
    if (entry.count > TRACK_LIMIT) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const { slug, event, referrer, url, href, text } = body as {
    slug?: string;
    event?: string;
    referrer?: string | null;
    url?: string | null;
    href?: string | null;
    text?: string | null;
  };
  if (!slug || !event || !["view", "cta_click", "prensa_click", "link_click"].includes(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Clic en un enlace concreto del artículo: se guarda con slug sintético
  // (__link__<slug>), el destino en `path` y el texto del enlace en `referrer`.
  // No toca el contador agregado del artículo.
  if (event === "link_click") {
    if (!href) return NextResponse.json({ ok: false }, { status: 400 });
    const ua = req.headers.get("user-agent");
    const device = detectDevice(ua);
    if (device === "bot") return NextResponse.json({ ok: true });
    await supabaseAdmin.from("articulos_views").insert({
      slug: `__link__${slug}`,
      source: "link",
      referrer: (text || "").slice(0, 120) || null,
      device,
      country: req.headers.get("x-vercel-ip-country") || null,
      path: href.slice(0, 400),
      visitor_hash: visitorHash(ip, ua),
    });
    return NextResponse.json({ ok: true });
  }

  if (event === "view" || event === "prensa_click") {
    const ua = req.headers.get("user-agent");
    const device = detectDevice(ua);
    // Ignorar bots en el conteo visible pero guardarlos marcados por si queremos verlos.
    const { path, utm_source, utm_medium, utm_campaign } = parseUrl(url ?? null);
    // Clasifica por utm_source primero (la IA llega sin referrer) y luego referrer.
    const source = clasificarFuente(referrer ?? null, utm_source);
    const country = req.headers.get("x-vercel-ip-country") || null;
    const city = req.headers.get("x-vercel-ip-city")
      ? decodeURIComponent(req.headers.get("x-vercel-ip-city") as string)
      : null;
    const vh = visitorHash(ip, ua);

    // Las notas de prensa se guardan con un slug sintético para separarlas de
    // los artículos y no inflar el contador de ningún artículo.
    const storedSlug = event === "prensa_click" ? `__prensa__${slug}` : slug;

    const inserted = supabaseAdmin.from("articulos_views").insert({
      slug: storedSlug,
      source,
      referrer: referrer || null,
      device,
      country,
      city,
      utm_source,
      utm_medium,
      utm_campaign,
      path,
      visitor_hash: vh,
    });
    // Solo subimos el contador agregado de artículo si NO es bot y es una vista
    // real de artículo (las notas de prensa no tienen fila en `articulos`).
    if (device !== "bot" && event === "view") {
      await Promise.all([
        inserted,
        supabaseAdmin.rpc("increment_article_stat", { p_slug: slug, p_column: "views" }),
      ]);
    } else {
      await inserted;
    }
  } else {
    await supabaseAdmin.rpc("increment_article_stat", { p_slug: slug, p_column: "cta_clicks" });
  }

  return NextResponse.json({ ok: true });
}
