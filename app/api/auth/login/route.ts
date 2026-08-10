import { NextRequest, NextResponse } from "next/server";
import { verificarCredenciales, crearSesion } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  const user = await verificarCredenciales(email, password);
  if (!user) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  await crearSesion(user);
  return NextResponse.json({ ok: true, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
}
