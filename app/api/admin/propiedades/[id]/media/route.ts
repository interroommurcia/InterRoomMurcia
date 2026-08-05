import { NextRequest, NextResponse } from "next/server";
import { subirMedia } from "../../../../../../lib/propiedades";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file requerido" }, { status: 400 });
    const tipo = (form.get("tipo") as string) === "video" ? "video" : "foto";
    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await subirMedia(params.id, { nombre: file.name, buffer, contentType: file.type || "application/octet-stream" }, tipo);
    return NextResponse.json(media);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
