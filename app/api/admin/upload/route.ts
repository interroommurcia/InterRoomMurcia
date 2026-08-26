import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const maxDuration = 60;

const BUCKET = "pisos";

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "Faltan filename o contentType" }, { status: 400 });
  }

  const ext = filename.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("Error creando signed URL", error);
    return NextResponse.json({ error: "No se pudo generar la URL de subida" }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: publicData.publicUrl,
  });
}
