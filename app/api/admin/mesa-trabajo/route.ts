import { NextRequest, NextResponse } from "next/server";
import { listarTareas, crearTarea } from "../../../../lib/mesaTrabajo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarTareas());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.titulo || !body?.tipo) {
    return NextResponse.json({ error: "titulo y tipo son requeridos" }, { status: 400 });
  }
  try {
    const tarea = await crearTarea({
      tipo: body.tipo,
      titulo: body.titulo,
      fecha: body.fecha,
      hora: body.hora,
      cliente_id: body.cliente_id,
      asignado_a: body.asignado_a,
      notas: body.notas,
    });
    return NextResponse.json(tarea);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
