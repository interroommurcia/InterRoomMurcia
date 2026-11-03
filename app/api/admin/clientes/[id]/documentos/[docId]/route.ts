import { NextRequest, NextResponse } from "next/server";
import { descargarClienteDocumento, eliminarClienteDocumento } from "../../../../../../../lib/clienteDocumentos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const doc = await descargarClienteDocumento(params.docId);
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    // ?download=1 fuerza descarga; por defecto se abre en el navegador (inline).
    const descargar = new URL(req.url).searchParams.get("download") === "1";
    const disp = descargar ? "attachment" : "inline";
    return new NextResponse(doc.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `${disp}; filename="${encodeURIComponent(doc.nombre)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    await eliminarClienteDocumento(params.docId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
