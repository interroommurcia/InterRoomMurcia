import { NextRequest, NextResponse } from "next/server";
import { listarLiquidaciones, crearLiquidacion } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarLiquidaciones());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.persona || !Number.isFinite(Number(body?.importe))) {
    return NextResponse.json({ error: "persona e importe requeridos" }, { status: 400 });
  }
  try {
    const l = await crearLiquidacion({
      persona: String(body.persona),
      importe: Number(body.importe),
      fecha: body.fecha,
      concepto: body.concepto,
    });
    return NextResponse.json(l);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
