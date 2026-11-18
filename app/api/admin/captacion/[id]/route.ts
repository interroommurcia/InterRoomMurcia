import { NextRequest, NextResponse } from "next/server";
import { actualizarCasa, eliminarCasa, ESTADOS_CASA, type EstadoCasa } from "../../../../../lib/captacion";

export const dynamic = "force-dynamic";

const CAMPOS_TEXTO = ["nombre", "telefono", "zona", "direccion", "descripcion"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const campo of CAMPOS_TEXTO) {
    if (typeof body[campo] === "string") patch[campo] = body[campo];
  }
  if (typeof body.estado === "string" && ESTADOS_CASA.includes(body.estado as EstadoCasa)) {
    patch.estado = body.estado;
  }
  if ("piso_id" in body) {
    patch.piso_id = typeof body.piso_id === "string" && body.piso_id ? body.piso_id : null;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "sin cambios" }, { status: 400 });
  try {
    await actualizarCasa(params.id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarCasa(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
