import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getSesion } from "../../../../../lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSesion();
  if (!session || session.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json();
  const admin = getSupabaseAdmin();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.nombre) patch.nombre = body.nombre;
  if (body.rol) patch.rol = body.rol;
  if (typeof body.activo === "boolean") patch.activo = body.activo;

  if (body.password) {
    const { createHash, randomBytes } = await import("crypto");
    const salt = randomBytes(16).toString("hex");
    patch.password_salt = salt;
    patch.password_hash = createHash("sha256").update(salt + body.password).digest("hex");
  }

  const { error } = await admin.from("usuarios").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
