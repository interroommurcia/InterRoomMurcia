import { NextRequest, NextResponse } from "next/server";
import { descargarCreditoDocumento, eliminarCreditoDocumento } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await descargarCreditoDocumento(params.id);
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarCreditoDocumento(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
