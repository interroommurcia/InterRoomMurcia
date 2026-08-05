import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body?.filename) return NextResponse.json({ error: "filename requerido" }, { status: 400 });
  const tipo = body.tipo === "video" ? "video" : "foto";
  const habitacion_id: string | null = body.habitacion_id || null;
  const ext = String(body.filename).split(".").pop() || (tipo === "video" ? "mp4" : "jpg");
  const path = `${params.id}/${habitacion_id ?? "general"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from("propiedades").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message || "Error creando signed URL" }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path: data.path });
}
