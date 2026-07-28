import { NextRequest, NextResponse } from "next/server";
import { eliminarClienteGasto, marcarClienteGastoPagado, terminarClienteGastoRecurrente } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  try {
    if (typeof body?.pagado === "boolean") {
      await marcarClienteGastoPagado(params.id, body.pagado);
    }
    if (typeof body?.fechaFin === "string") {
      await terminarClienteGastoRecurrente(params.id, body.fechaFin);
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarClienteGasto(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
