import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getClientIp } from "../../../../lib/security";

const trackRateMap = new Map<string, { count: number; resetAt: number }>();
const TRACK_LIMIT = 100;
const TRACK_WINDOW = 60 * 60 * 1000;

function detectSource(referrer: string | null): string {
  if (!referrer) return "direct";
  const r = referrer.toLowerCase();
  if (r.includes("chatgpt.com") || r.includes("chat.openai.com") || r.includes("openai.com")) return "chatgpt";
  if (r.includes("claude.ai") || r.includes("anthropic.com")) return "claude";
  if (r.includes("grok.") || r.includes("x.ai")) return "grok";
  if (r.includes("gemini.google.com") || r.includes("bard.google.com")) return "gemini";
  if (r.includes("perplexity.ai")) return "perplexity";
  if (r.includes("copilot.microsoft.com") || r.includes("bing.com")) return "copilot";
  if (r.includes("duckduckgo.com")) return "duckduckgo";
  if (r.includes("google.")) return "google";
  if (r.includes("instagram.com")) return "instagram";
  if (r.includes("linkedin.com")) return "linkedin";
  if (r.includes("twitter.com") || r.includes("t.co") || r.includes("x.com")) return "x";
  if (r.includes("facebook.com") || r.includes("fb.")) return "facebook";
  if (r.includes("whatsapp.com") || r.includes("wa.me")) return "whatsapp";
  if (r.includes("tiktok.com")) return "tiktok";
  if (r.includes("youtube.com") || r.includes("youtu.be")) return "youtube";
  if (r.includes("reddit.com")) return "reddit";
  return "other";
}

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
  const { slug, event, referrer, url } = body as {
    slug?: string;
    event?: string;
    referrer?: string | null;
    url?: string | null;
  };
  if (!slug || !event || !["view", "cta_click"].includes(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (event === "view") {
    const ua = req.headers.get("user-agent");
    const device = detectDevice(ua);
    // Ignorar bots en el conteo visible pero guardarlos marcados por si queremos verlos.
    const source = detectSource(referrer ?? null);
    const { path, utm_source, utm_medium, utm_campaign } = parseUrl(url ?? null);
    const country = req.headers.get("x-vercel-ip-country") || null;
    const city = req.headers.get("x-vercel-ip-city")
      ? decodeURIComponent(req.headers.get("x-vercel-ip-city") as string)
      : null;
    const vh = visitorHash(ip, ua);

    const inserted = supabaseAdmin.from("articulos_views").insert({
      slug,
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
    // Solo subimos el contador agregado si NO es bot, para que
    // "vistas" refleje humanos.
    if (device !== "bot") {
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
