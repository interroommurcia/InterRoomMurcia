import { NextRequest, NextResponse } from "next/server";
import { actualizarEstadoTarea, eliminarTarea } from "../../../../../lib/mesaTrabajo";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (body?.estado !== "pendiente" && body?.estado !== "hecha") {
    return NextResponse.json({ error: "estado inválido" }, { status: 400 });
  }
  try {
    await actualizarEstadoTarea(params.id, body.estado);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarTarea(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
