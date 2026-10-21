import { NextRequest, NextResponse } from "next/server";
import { descargarIngresoFactura, eliminarIngresoFactura, subirIngresoFactura } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const factura = await descargarIngresoFactura(params.id);
    if (!factura) return NextResponse.json({ error: "Sin factura" }, { status: 404 });
    return new NextResponse(new Uint8Array(factura.buffer), {
      headers: {
        "Content-Type": factura.contentType,
        "Content-Disposition": `inline; filename="${factura.nombre}"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file requerido" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Archivo demasiado grande (máx. 4MB)" }, { status: 413 });

  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido (PDF, JPG, PNG, WEBP)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resultado = await subirIngresoFactura(params.id, file.name, buffer, file.type || "application/pdf");
    return NextResponse.json(resultado);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarIngresoFactura(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
