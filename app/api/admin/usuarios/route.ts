import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { crearUsuario, getSesion } from "../../../../lib/auth";

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("usuarios")
    .select("id, email, nombre, rol, activo, trabajador_id, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSesion();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 });
  }

  const { email, password, nombre, rol } = await req.json();
  if (!email || !password || !nombre) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  try {
    const user = await crearUsuario(email, password, nombre, rol || "comercial");
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el usuario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
