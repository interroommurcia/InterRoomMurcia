import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body?.path) return NextResponse.json({ error: "path requerido" }, { status: 400 });
  const tipo = body.tipo === "video" ? "video" : "foto";
  const habitacion_id: string | null = body.habitacion_id || null;
  const admin = getSupabaseAdmin();
  const { data: pub } = admin.storage.from("propiedades").getPublicUrl(String(body.path));
  const { data, error } = await admin
    .from("propiedad_media")
    .insert({ propiedad_id: params.id, habitacion_id, tipo, url: pub.publicUrl, storage_path: String(body.path) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
