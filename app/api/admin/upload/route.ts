import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const maxDuration = 60;

const BUCKET = "pisos";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

let bucketReady = false;
async function ensureBucket(admin: ReturnType<typeof getSupabaseAdmin>) {
  if (bucketReady) return;
  const { error } = await admin.storage.updateBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ["image/*", "video/*"],
  });
  if (error) {
    console.error("Error actualizando bucket:", error);
  } else {
    console.log("Bucket configurado: fileSizeLimit =", MAX_FILE_SIZE);
  }
  bucketReady = true;
}

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "Faltan filename o contentType" }, { status: 400 });
  }

  const ext = filename.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const admin = getSupabaseAdmin();

  await ensureBucket(admin);

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
