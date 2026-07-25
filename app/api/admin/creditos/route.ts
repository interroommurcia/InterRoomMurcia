import { NextRequest, NextResponse } from "next/server";
import { listarOperacionesCreditos, crearOperacionCredito } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarOperacionesCreditos());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const precio = Number(body?.precio);
  if (!body?.cliente_id || !body?.fecha || !Number.isFinite(precio)) {
    return NextResponse.json({ error: "cliente_id, fecha y precio son requeridos" }, { status: 400 });
  }
  try {
    const operacion = await crearOperacionCredito({
      cliente_id: body.cliente_id,
      fecha: body.fecha,
      precio,
      notas: body.notas,
    });
    return NextResponse.json(operacion);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
