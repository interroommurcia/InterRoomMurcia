import { NextRequest, NextResponse } from "next/server";
import { listarOperaciones, crearOperacion } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarOperaciones());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const precioVenta = Number(body?.precio_venta);
  if (!body?.cliente_id || !body?.fecha_cierre || !Number.isFinite(precioVenta)) {
    return NextResponse.json({ error: "cliente_id, fecha_cierre y precio_venta son requeridos" }, { status: 400 });
  }
  try {
    const operacion = await crearOperacion({
      cliente_id: body.cliente_id,
      fecha_cierre: body.fecha_cierre,
      precio_venta: precioVenta,
      comision_pct: body.comision_pct ? Number(body.comision_pct) : undefined,
      notas: body.notas,
    });
    return NextResponse.json(operacion);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
