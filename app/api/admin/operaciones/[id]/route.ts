import { NextRequest, NextResponse } from "next/server";
import { actualizarOperacion, eliminarOperacion } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  try {
    await actualizarOperacion(params.id, {
      precio_venta: body.precio_venta !== undefined ? Number(body.precio_venta) : undefined,
      comision_pct: body.comision_pct !== undefined ? Number(body.comision_pct) : undefined,
      comision_calculada: body.comision_calculada !== undefined ? Number(body.comision_calculada) : undefined,
      fecha_cierre: body.fecha_cierre,
      notas: body.notas,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarOperacion(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
