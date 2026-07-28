import { NextRequest, NextResponse } from "next/server";
import { listarCreditoGastos, añadirCreditoGasto, type CategoriaGasto } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await listarCreditoGastos(params.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const importe = Number(body?.importe);
  if (!body?.concepto || !Number.isFinite(importe)) {
    return NextResponse.json({ error: "concepto e importe son requeridos" }, { status: 400 });
  }
  try {
    await añadirCreditoGasto(params.id, body.concepto, importe, body?.es_negativo !== false, (body?.categoria || "otros") as CategoriaGasto);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
