import { NextRequest, NextResponse } from "next/server";
import { actualizarTarea, eliminarTarea } from "../../../../../lib/mesaTrabajo";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.estado === "pendiente" || body.estado === "hecha") patch.estado = body.estado;
  if (Array.isArray(body.asignados_ids)) patch.asignados_ids = body.asignados_ids.filter((s: unknown) => typeof s === "string");
  if (body.notas !== undefined) patch.notas = body.notas || null;
  if (typeof body.tipo === "string" && ["tarea", "cita", "visita"].includes(body.tipo)) patch.tipo = body.tipo;
  if (typeof body.titulo === "string" && body.titulo.trim()) patch.titulo = body.titulo.trim();
  if (body.fecha !== undefined) patch.fecha = body.fecha || null;
  if (body.hora !== undefined) patch.hora = body.hora || null;
  if (body.cliente_id !== undefined) patch.cliente_id = body.cliente_id || null;
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
