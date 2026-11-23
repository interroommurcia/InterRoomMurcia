import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Banco de vídeo de fondo (b-roll) vía Pixabay (API gratuita, key inmediata).
// POST { query } -> { url, width, height } del mejor clip ligero, o { url: null }.
// GET ?url=... -> proxea los bytes del clip (evita CORS y oculta nada sensible).

type PixVideo = { url: string; width: number; height: number; size: number };
type PixHit = { duration: number; videos: Record<string, PixVideo> };

// Elige el clip más ligero decente: preferimos "small"/"tiny" (menos MB = más
// rápido en ffmpeg.wasm). Recortamos a 9:16 en el cliente, así que no exigimos
// vertical.
function elegirArchivo(hit: PixHit): PixVideo | null {
  const orden = ["small", "tiny", "medium", "large"];
  for (const k of orden) {
    const v = hit.videos[k];
    if (v?.url && v.width > 0) return v;
  }
  const any = Object.values(hit.videos).find((v) => v?.url);
  return any ?? null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url requerida" }, { status: 400 });
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }
  if (!/(^|\.)pixabay\.com$/.test(host)) {
    return NextResponse.json({ error: "host no permitido" }, { status: 403 });
  }
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `fuente ${upstream.status}` }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "PIXABAY_API_KEY no configurada" }, { status: 500 });

  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query requerida" }, { status: 400 });
  }

  const endpoint = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(
    query.slice(0, 90)
  )}&per_page=8&safesearch=true&video_type=film`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    return NextResponse.json({ error: `Pixabay ${res.status}` }, { status: 502 });
  }
  const data = await res.json();
  const hits: PixHit[] = data?.hits ?? [];
  if (hits.length === 0) return NextResponse.json({ url: null });

  // Primer hit con archivo usable.
  for (const hit of hits) {
    const file = elegirArchivo(hit);
    if (file) {
      return NextResponse.json({ url: file.url, width: file.width, height: file.height });
    }
  }
  return NextResponse.json({ url: null });
}
