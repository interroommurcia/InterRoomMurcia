import { NextRequest, NextResponse } from "next/server";
import { crearHabitacion } from "../../../../../../lib/propiedades";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  try {
    const h = await crearHabitacion(params.id, {
      nombre: body.nombre,
      precio: body.precio ?? null,
      cliente_id: body.cliente_id ?? null,
      orden: body.orden ?? 0,
    });
    return NextResponse.json(h);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
