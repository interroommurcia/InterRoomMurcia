import { NextRequest, NextResponse } from "next/server";
import { getClientePorToken, actualizarDatosPublicos } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const cliente = await getClientePorToken(params.token);
    if (!cliente) return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    return NextResponse.json({
      nombre: cliente.nombre,
      apellidos: cliente.apellidos,
      telefono: cliente.telefono,
      tipo: cliente.tipo,
      zona_interes: cliente.zona_interes,
      operacion: cliente.operacion,
      datos_completados: cliente.datos_completados,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre || !body?.tipo) {
    return NextResponse.json({ error: "nombre y tipo son requeridos" }, { status: 400 });
  }
  try {
    const cliente = await getClientePorToken(params.token);
    if (!cliente) return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
    await actualizarDatosPublicos(params.token, {
      nombre: body.nombre,
      apellidos: body.apellidos,
      telefono: body.telefono,
      tipo: body.tipo,
      zona_interes: body.zona_interes,
      operacion: body.operacion,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
