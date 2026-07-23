import { NextRequest, NextResponse } from "next/server";
import { actualizarCliente, eliminarCliente } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  try {
    await actualizarCliente(params.id, {
      ...body,
      mensualidad: body.mensualidad !== undefined ? Number(body.mensualidad) || 0 : undefined,
      comision_pct_alquiler: body.comision_pct_alquiler !== undefined ? Number(body.comision_pct_alquiler) || 15 : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarCliente(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
