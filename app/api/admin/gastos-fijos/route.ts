import { NextRequest, NextResponse } from "next/server";
import { listarGastosFijos, crearGastoFijo } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarGastosFijos());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.concepto || !Number.isFinite(Number(body?.importe_mensual))) {
    return NextResponse.json({ error: "concepto e importe_mensual requeridos" }, { status: 400 });
  }
  try {
    const g = await crearGastoFijo({
      concepto: String(body.concepto),
      importe_mensual: Number(body.importe_mensual),
      categoria: body.categoria,
      fecha_inicio: body.fecha_inicio,
      notas: body.notas,
    });
    return NextResponse.json(g);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
