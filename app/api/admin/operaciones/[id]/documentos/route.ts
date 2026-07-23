import { NextRequest, NextResponse } from "next/server";
import { listarDocumentos, subirDocumento } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await listarDocumentos(params.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file requerido" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Archivo demasiado grande (máx. 4MB)" }, { status: 413 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const documento = await subirDocumento(params.id, file.name, buffer, file.type || "application/pdf");
    return NextResponse.json(documento);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
