import { NextRequest, NextResponse } from "next/server";
import { actualizarPropiedad, eliminarPropiedad } from "../../../../../lib/propiedades";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  try {
    await actualizarPropiedad(params.id, {
      tipo: body.tipo,
      nombre: body.nombre,
      direccion: body.direccion,
      num_habitaciones: body.num_habitaciones,
      num_banos: body.num_banos,
      precio_total: body.precio_total,
      notas: body.notas,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarPropiedad(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
