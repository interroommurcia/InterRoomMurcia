import { NextResponse } from "next/server";
import { descargarPdfContrato, getContrato } from "../../../../../../lib/contratos";
import { generarYSubirPdfSiProcede } from "../../../../../../lib/contratos-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Descarga el PDF del contrato. Si no se ha generado todavía y el
 * contrato está firmado por ambas partes, lo genera on-demand.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contrato = await getContrato(id);
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

  // On-demand si falta.
  if (!contrato.pdf_storage_path && contrato.estado === "firmado") {
    try {
      await generarYSubirPdfSiProcede(id);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "No se pudo generar el PDF" },
        { status: 500 },
      );
    }
  }

  const pdf = await descargarPdfContrato(id);
  if (!pdf) {
    return NextResponse.json(
      { error: "PDF no disponible todavía (faltan firmas)" },
      { status: 404 },
    );
  }

  const filename = `contrato-exclusiva-${contrato.datos.propietario?.nombre?.replace(/[^a-zA-Z0-9]/g, "-") || id.slice(0, 8)}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
