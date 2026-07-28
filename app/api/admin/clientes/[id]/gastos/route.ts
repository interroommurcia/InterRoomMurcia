import { NextRequest, NextResponse } from "next/server";
import { listarClienteGastos, crearClienteGasto, type CategoriaGasto } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await listarClienteGastos(params.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const concepto = typeof body?.concepto === "string" ? body.concepto.trim() : "";
  const importe = Number(body?.importe);
  const categoria = (body?.categoria || "otros") as CategoriaGasto;
  const esRecurrente = Boolean(body?.esRecurrente);
  if (!concepto || !Number.isFinite(importe) || importe <= 0) {
    return NextResponse.json({ error: "concepto e importe > 0 requeridos" }, { status: 400 });
  }
  try {
    const creado = await crearClienteGasto({
      cliente_id: params.id,
      concepto,
      importe,
      categoria,
      es_recurrente: esRecurrente,
      fecha_inicio: body?.fechaInicio ?? null,
      fecha_fin: body?.fechaFin ?? null,
      fecha_pago: body?.fechaPago ?? null,
      pagado: Boolean(body?.pagado),
      notas: body?.notas ?? null,
    });
    return NextResponse.json(creado);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
