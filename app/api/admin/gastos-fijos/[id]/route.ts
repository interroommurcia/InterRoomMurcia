import { NextRequest, NextResponse } from "next/server";
import { terminarGastoFijo, eliminarGastoFijo } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body?.fecha_fin) return NextResponse.json({ error: "fecha_fin requerida" }, { status: 400 });
  try {
    await terminarGastoFijo(params.id, String(body.fecha_fin));
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
