import { NextRequest, NextResponse } from "next/server";
import { actualizarTarea, eliminarTarea } from "../../../../../lib/mesaTrabajo";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const patch: { estado?: "pendiente" | "hecha"; asignado_a?: string | null } = {};
  if (body.estado === "pendiente" || body.estado === "hecha") patch.estado = body.estado;
  if (body.asignado_a !== undefined) patch.asignado_a = body.asignado_a || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "sin cambios" }, { status: 400 });
  try {
    await actualizarTarea(params.id, patch);
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
