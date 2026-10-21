import { NextResponse } from "next/server";
import { listarPagosFacturablesTodos } from "../../../../../lib/factura/pendientes";
import { sugerirNumero } from "../../../../../lib/factura/numeracion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Devuelve todos los cobros pendientes de facturar de todos los clientes y el
// número de factura sugerido. Pensado para la vista de generación en lote.
export async function GET() {
  try {
    const [pagos, numeroSugerido] = await Promise.all([
      listarPagosFacturablesTodos(),
      sugerirNumero(),
    ]);
    return NextResponse.json({ pagos, numeroSugerido });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
