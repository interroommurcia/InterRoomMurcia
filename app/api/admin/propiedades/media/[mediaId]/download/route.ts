import { NextRequest, NextResponse } from "next/server";
import { descargarMedia } from "../../../../../../../lib/propiedades";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { mediaId: string } }) {
  const archivo = await descargarMedia(params.mediaId);
  if (!archivo) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return new NextResponse(new Uint8Array(archivo.buffer), {
    headers: {
      "Content-Type": archivo.contentType,
      "Content-Disposition": `attachment; filename="${archivo.nombre}"`,
    },
  });
}
