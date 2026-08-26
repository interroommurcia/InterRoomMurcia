import { NextRequest, NextResponse } from "next/server";
import { resetearPassword } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: "Token y contraseña requeridos" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const ok = await resetearPassword(token, password);
  if (!ok) {
    return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
