import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const maxDuration = 60;

// Vercel limita el body de las funciones serverless a ~4.5MB independientemente
// de este valor: sirve como mensaje de error más claro que el 413 genérico de
// la plataforma. Para vídeos más pesados, usa el embed de YouTube/Vimeo.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const slug = form.get("slug");

  if (!(file instanceof File) || typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "file y slug requeridos" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx. 4MB)" }, { status: 413 });
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const ALLOWED = ["jpg", "jpeg", "png", "webp", "avif", "gif"];
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `Extensión .${ext} no permitida. Solo imágenes: ${ALLOWED.join(", ")}` }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.storage.createBucket("blog-imagenes", { public: true }).catch(() => {});

  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("blog-imagenes")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from("blog-imagenes").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, type: file.type });
}
