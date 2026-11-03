import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function slugify(s: string) {
  return (s || "propiedad")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "propiedad";
}

function extDe(url: string, contentType: string | null): string {
  const limpio = url.split("?")[0];
  const m = limpio.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  if (m) return m[1].toLowerCase();
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  return "jpg";
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await getSupabaseAdmin()
    .from("pisos")
    .select("titulo,slug,image_url,gallery")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const urls: string[] = [];
  if (typeof data.image_url === "string" && data.image_url) urls.push(data.image_url);
  if (Array.isArray(data.gallery)) {
    for (const u of data.gallery) if (typeof u === "string" && u && !urls.includes(u)) urls.push(u);
  }
  if (urls.length === 0) return NextResponse.json({ error: "Esta propiedad no tiene fotos" }, { status: 404 });

  const base = slugify(String(data.slug || data.titulo || params.id));
  const zip = new JSZip();
  let i = 0;
  let fallidas = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        fallidas++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = extDe(url, res.headers.get("content-type"));
      const nombre = i === 0 ? `${base}-principal.${ext}` : `${base}-${String(i).padStart(2, "0")}.${ext}`;
      zip.file(nombre, buf);
      i++;
    } catch {
      fallidas++;
    }
  }

  if (i === 0) return NextResponse.json({ error: "No se pudo descargar ninguna foto" }, { status: 502 });

  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(zipBuf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fotos-${base}.zip"`,
      "Cache-Control": "private, no-store",
      ...(fallidas ? { "X-Fotos-Fallidas": String(fallidas) } : {}),
    },
  });
}
