import { NextRequest, NextResponse } from "next/server";
import { actualizarAlquilerComision, eliminarAlquilerComision } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body requerido" }, { status: 400 });
  try {
    const patch: Record<string, unknown> = {};
    if (body.cobrado !== undefined) patch.cobrado = Boolean(body.cobrado);
    if (body.comision_calculada !== undefined) patch.comision_calculada = Number(body.comision_calculada);
    if (body.notas !== undefined) patch.notas = body.notas;
    await actualizarAlquilerComision(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarAlquilerComision(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
