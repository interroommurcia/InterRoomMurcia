import { NextRequest, NextResponse } from "next/server";
import { listarAlquilerComisiones, crearAlquilerComision } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarAlquilerComisiones());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const precioAlquiler = Number(body?.precio_alquiler);
  if (!body?.cliente_id || !body?.fecha || !Number.isFinite(precioAlquiler)) {
    return NextResponse.json({ error: "cliente_id, fecha y precio_alquiler son requeridos" }, { status: 400 });
  }
  try {
    const op = await crearAlquilerComision({
      cliente_id: body.cliente_id,
      fecha: body.fecha,
      precio_alquiler: precioAlquiler,
      comision_pct: body.comision_pct ? Number(body.comision_pct) : undefined,
      notas: body.notas,
    });
    return NextResponse.json(op);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
