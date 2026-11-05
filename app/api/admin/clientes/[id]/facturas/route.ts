import { NextRequest, NextResponse } from "next/server";
import { listarFacturas } from "../../../../../../lib/factura/facturas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista las facturas emitidas de un cliente concreto. A diferencia de
// /api/admin/facturas (admin-only), esta vive bajo /api/admin/clientes y es
// accesible a comercial/gestora: solo expone las facturas de ESE cliente.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const facturas = await listarFacturas(params.id);
    const limpio = facturas.map((f) => ({
      id: f.id,
      numero: f.numero,
      fecha: f.fecha,
      concepto: f.concepto,
      total: f.total,
    }));
    return NextResponse.json(limpio);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
