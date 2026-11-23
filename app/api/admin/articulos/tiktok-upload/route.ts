import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

// Devuelve una URL firmada para subir el vídeo del TikTok DIRECTAMENTE a Supabase
// Storage desde el navegador (evita el límite de 4,5 MB del cuerpo de las
// funciones) y la URL pública final para montar el QR. El vídeo es temporal:
// solo sirve para pasarlo al móvil escaneando el QR.
export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const { slug } = await req.json().catch(() => ({ slug: "tiktok" }));
  const safe = String(slug || "tiktok").replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 60);

  const bucket = "tiktok-videos";
  await supabaseAdmin.storage.createBucket(bucket, { public: true, fileSizeLimit: "50MB" }).catch(() => {});

  const path = `${safe}-${Date.now()}.mp4`;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "No se pudo preparar la subida" }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ bucket, path, token: data.token, publicUrl: pub.publicUrl });
}
