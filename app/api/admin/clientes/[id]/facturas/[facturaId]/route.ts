import { NextRequest, NextResponse } from "next/server";
import { getFactura, descargarFacturaPdf } from "../../../../../../../lib/factura/facturas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Sirve el PDF de una factura comprobando que pertenece a este cliente, para
// que comercial/gestora solo puedan abrir las facturas del cliente que ven.
export async function GET(_req: NextRequest, { params }: { params: { id: string; facturaId: string } }) {
  try {
    const factura = await getFactura(params.facturaId);
    if (!factura || factura.cliente_id !== params.id) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }
    const doc = await descargarFacturaPdf(params.facturaId);
    if (!doc) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    return new NextResponse(new Uint8Array(doc.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.nombre}"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
