import { NextRequest, NextResponse } from "next/server";
import { actualizarGastoEmpresa, eliminarGastoEmpresa } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body requerido" }, { status: 400 });
  try {
    const patch: Record<string, unknown> = {};
    if (body.concepto !== undefined) patch.concepto = body.concepto;
    if (body.importe !== undefined) patch.importe = Number(body.importe);
    if (body.fecha !== undefined) patch.fecha = body.fecha;
    if (body.categoria !== undefined) patch.categoria = body.categoria;
    if (body.pagado_por !== undefined) patch.pagado_por = body.pagado_por || null;
    if (body.liquidado !== undefined) {
      patch.liquidado = body.liquidado;
      patch.fecha_liquidacion = body.liquidado ? new Date().toISOString().slice(0, 10) : null;
    }
    if (body.notas !== undefined) patch.notas = body.notas || null;
    await actualizarGastoEmpresa(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarGastoEmpresa(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
