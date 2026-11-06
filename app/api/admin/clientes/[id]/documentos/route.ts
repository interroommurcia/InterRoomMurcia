import { NextRequest, NextResponse } from "next/server";
import {
  listarClienteDocumentos,
  subirClienteDocumento,
  CATEGORIAS_DOCUMENTO,
  type CategoriaDocumento,
} from "../../../../../../lib/clienteDocumentos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const TIPOS_OK = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ocultarSoloContabilidad = new URL(req.url).searchParams.get("view") === "clientes";
    return NextResponse.json(await listarClienteDocumentos(params.id, { ocultarSoloContabilidad }));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera los 20 MB" }, { status: 400 });
    }
    const contentType = file.type || "application/octet-stream";
    if (!TIPOS_OK.has(contentType)) {
      return NextResponse.json({ error: "Solo se permiten PDF o imágenes (JPG, PNG, WEBP)" }, { status: 400 });
    }
    const categoriaRaw = String(form.get("categoria") || "otro");
    const categoria = (CATEGORIAS_DOCUMENTO.some((c) => c.value === categoriaRaw) ? categoriaRaw : "otro") as CategoriaDocumento;
    const nombre = (String(form.get("nombre") || file.name || "documento").trim() || "documento").slice(0, 150);

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await subirClienteDocumento(params.id, nombre, categoria, buffer, contentType);
    return NextResponse.json(doc);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
