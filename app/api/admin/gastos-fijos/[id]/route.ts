import { NextRequest, NextResponse } from "next/server";
import { actualizarGastoFijo, terminarGastoFijo, eliminarGastoFijo } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "body requerido" }, { status: 400 });
  try {
    if (body.fecha_fin !== undefined && Object.keys(body).length === 1) {
      await terminarGastoFijo(params.id, String(body.fecha_fin));
    } else {
      const patch: Record<string, unknown> = {};
      if (body.concepto !== undefined) patch.concepto = body.concepto;
      if (body.importe_mensual !== undefined) patch.importe_mensual = Number(body.importe_mensual);
      if (body.categoria !== undefined) patch.categoria = body.categoria;
      if (body.tipo !== undefined) patch.tipo = body.tipo;
      if (body.fecha_inicio !== undefined) patch.fecha_inicio = body.fecha_inicio;
      if (body.fecha_fin !== undefined) patch.fecha_fin = body.fecha_fin;
      if (body.pagado_por !== undefined) patch.pagado_por = body.pagado_por || null;
      if (body.liquidado !== undefined) {
        patch.liquidado = body.liquidado;
        patch.fecha_liquidacion = body.liquidado ? new Date().toISOString().slice(0, 10) : null;
      }
      if (body.notas !== undefined) patch.notas = body.notas || null;
      await actualizarGastoFijo(params.id, patch);
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarGastoFijo(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
