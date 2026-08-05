import { NextRequest, NextResponse } from "next/server";
import { listarPropiedades, crearPropiedad } from "../../../../lib/propiedades";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarPropiedades());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  try {
    const p = await crearPropiedad({
      tipo: body.tipo,
      nombre: body.nombre,
      direccion: body.direccion,
      num_habitaciones: body.num_habitaciones,
      num_banos: body.num_banos,
      precio_total: body.precio_total,
      notas: body.notas,
    });
    return NextResponse.json(p);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
