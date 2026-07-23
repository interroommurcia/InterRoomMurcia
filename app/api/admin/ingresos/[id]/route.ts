import { NextRequest, NextResponse } from "next/server";
import { eliminarIngreso, marcarIngresoCobrado } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (typeof body?.cobrado !== "boolean") {
    return NextResponse.json({ error: "cobrado (boolean) es requerido" }, { status: 400 });
  }
  try {
    await marcarIngresoCobrado(params.id, body.cobrado);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarIngreso(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
