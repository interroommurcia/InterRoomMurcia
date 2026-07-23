import { NextRequest, NextResponse } from "next/server";
import { listarIngresos, añadirIngreso } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await listarIngresos(params.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const mes = typeof body?.mes === "string" ? body.mes : null;
  const ingresoBruto = Number(body?.ingresoBruto);
  if (!mes || !Number.isFinite(ingresoBruto)) {
    return NextResponse.json({ error: "mes e ingresoBruto son requeridos" }, { status: 400 });
  }
  try {
    await añadirIngreso(params.id, mes, ingresoBruto, Number(body?.comisionPct) || 15, body?.notas);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
