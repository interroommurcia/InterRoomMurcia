import { NextRequest, NextResponse } from "next/server";
import { listarGastosEmpresa, crearGastoEmpresa } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarGastosEmpresa());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.concepto || !Number.isFinite(Number(body?.importe))) {
    return NextResponse.json({ error: "concepto e importe requeridos" }, { status: 400 });
  }
  try {
    const g = await crearGastoEmpresa({
      concepto: String(body.concepto),
      importe: Number(body.importe),
      fecha: body.fecha || new Date().toISOString().slice(0, 10),
      categoria: body.categoria,
      pagado_por: body.pagado_por,
      notas: body.notas,
    });
    return NextResponse.json(g);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
