import { NextRequest, NextResponse } from "next/server";
import { listarGastoFijoDocumentos, subirGastoFijoDocumento } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await listarGastoFijoDocumentos(params.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ALLOWED_DOC_EXTS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file requerido" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Archivo demasiado grande (máx. 4MB)" }, { status: 413 });

  const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  if (!ALLOWED_DOC_EXTS.includes(ext) || !ALLOWED_DOC_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const documento = await subirGastoFijoDocumento(params.id, file.name, buffer, file.type || "application/pdf");
    return NextResponse.json(documento);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
