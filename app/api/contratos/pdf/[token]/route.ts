import { NextResponse } from "next/server";
import { descargarPdfContrato, getContratoPorToken } from "../../../../../lib/contratos";
import { generarYSubirPdfSiProcede } from "../../../../../lib/contratos-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Descarga PÚBLICA del PDF del contrato por token (el que firmó el
 * propietario). Solo accesible una vez que ambas partes han firmado.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contrato = await getContratoPorToken(token);
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

  if (contrato.estado !== "firmado") {
    return NextResponse.json(
      { error: "El PDF estará disponible cuando ambas partes hayan firmado" },
      { status: 409 },
    );
  }

  if (!contrato.pdf_storage_path) {
    try {
      await generarYSubirPdfSiProcede(contrato.id);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "No se pudo generar el PDF" },
        { status: 500 },
      );
    }
  }

  const pdf = await descargarPdfContrato(contrato.id);
  if (!pdf) return NextResponse.json({ error: "PDF no disponible" }, { status: 404 });

  const filename = `contrato-exclusiva-${contrato.id.slice(0, 8)}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
