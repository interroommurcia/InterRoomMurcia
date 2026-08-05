import { NextRequest, NextResponse } from "next/server";
import { actualizarHabitacion, eliminarHabitacion } from "../../../../../../lib/propiedades";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { habId: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  try {
    await actualizarHabitacion(params.habId, {
      nombre: body.nombre,
      precio: body.precio ?? null,
      cliente_id: body.cliente_id ?? null,
      libre_enero: typeof body.libre_enero === "boolean" ? body.libre_enero : undefined,
      orden: body.orden ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { habId: string } }) {
  try {
    await eliminarHabitacion(params.habId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
