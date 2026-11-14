import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

// Estadísticas AGREGADAS por origen de generación: compara "masa" vs "unitario"
// y, dentro del grupo masivo, muestra qué artículos y qué temas rinden mejor y
// qué enlaces se pulsan más. Complementa a /stats, que es por artículo.

type Bucket = { key: string; label: string; count: number; pct: number };

type Art = {
  slug: string;
  h1: string;
  keyword: string | null;
  views: number | null;
  cta_clicks: number | null;
  origen_generacion: string | null;
};

function resumen(arts: Art[]) {
  const articulos = arts.length;
  const views = arts.reduce((s, a) => s + (a.views ?? 0), 0);
  const ctaClicks = arts.reduce((s, a) => s + (a.cta_clicks ?? 0), 0);
  const ctr = views > 0 ? Math.round((ctaClicks / views) * 100) : 0;
  const viewsMedia = articulos > 0 ? Math.round(views / articulos) : 0;
  return { articulos, views, ctaClicks, ctr, viewsMedia };
}

export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("articulos")
    .select("slug, h1, keyword, views, cta_clicks, origen_generacion")
    .eq("estado", "publicado");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const arts = (data ?? []) as Art[];
  const masa = arts.filter((a) => a.origen_generacion === "masa");
  const unitario = arts.filter((a) => a.origen_generacion !== "masa");

  // Clics en enlaces de los artículos del grupo masivo. Se guardan bajo el slug
  // sintético __link__<slug> (path = destino, referrer = texto del enlace).
  const masaLinkSlugs = masa.map((a) => `__link__${a.slug}`);
  let linkClicks: Bucket[] = [];
  let linkClicksTotal = 0;
  if (masaLinkSlugs.length > 0) {
    const { data: linkData } = await supabaseAdmin
      .from("articulos_views")
      .select("path, referrer")
      .in("slug", masaLinkSlugs)
      .limit(10000);
    const rows = (linkData ?? []) as { path: string | null; referrer: string | null }[];
    const counts = new Map<string, { count: number; text: string }>();
    for (const r of rows) {
      if (!r.path) continue;
      linkClicksTotal++;
      const prev = counts.get(r.path);
      counts.set(r.path, { count: (prev?.count ?? 0) + 1, text: prev?.text || (r.referrer ?? "") });
    }
    linkClicks = Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([path, v]) => {
        let dest = path;
        try {
          const u = new URL(path);
          dest = u.hostname.replace(/^www\./, "") + u.pathname;
        } catch {
          /* path no absoluto */
        }
        const label = v.text ? `${v.text} → ${dest}` : dest;
        return { key: path, label, count: v.count, pct: linkClicksTotal > 0 ? Math.round((v.count / linkClicksTotal) * 100) : 0 };
      });
  }

  // Ranking de artículos del grupo masivo por vistas (el que mejor funciona).
  const ranking = [...masa]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 20)
    .map((a) => ({
      slug: a.slug,
      h1: a.h1,
      keyword: a.keyword,
      views: a.views ?? 0,
      ctaClicks: a.cta_clicks ?? 0,
      ctr: (a.views ?? 0) > 0 ? Math.round(((a.cta_clicks ?? 0) / (a.views ?? 1)) * 100) : 0,
    }));

  // Temas que mejor funcionan: agrupa por keyword y suma vistas.
  const temaMap = new Map<string, { views: number; arts: number }>();
  for (const a of masa) {
    const k = (a.keyword || a.h1 || "(sin keyword)").trim();
    const prev = temaMap.get(k);
    temaMap.set(k, { views: (prev?.views ?? 0) + (a.views ?? 0), arts: (prev?.arts ?? 0) + 1 });
  }
  const maxTemaViews = Math.max(1, ...Array.from(temaMap.values()).map((v) => v.views));
  const temas: Bucket[] = Array.from(temaMap.entries())
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 15)
    .map(([key, v]) => ({
      key,
      label: v.arts > 1 ? `${key} (${v.arts} art.)` : key,
      count: v.views,
      pct: Math.round((v.views / maxTemaViews) * 100),
    }));

  return NextResponse.json({
    masa: resumen(masa),
    unitario: resumen(unitario),
    ranking,
    temas,
    linkClicks,
    linkClicksTotal,
  });
}
