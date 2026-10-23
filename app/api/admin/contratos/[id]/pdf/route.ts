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

  if (contrato.estado !== "firmado") {
    return NextResponse.json(
      { error: `El contrato aún no está firmado por ambas partes (estado: ${contrato.estado})` },
      { status: 409 },
    );
  }

  // On-demand si falta.
  if (!contrato.pdf_storage_path) {
    try {
      await generarYSubirPdfSiProcede(id);
    } catch (e: unknown) {
      console.error("[admin pdf] generación fallida", { contratoId: id, error: e });
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "No se pudo generar el PDF" },
        { status: 500 },
      );
    }
  }

  const pdf = await descargarPdfContrato(id);
  if (!pdf) {
    console.error("[admin pdf] PDF no disponible tras intentar generar", { contratoId: id });
    return NextResponse.json(
      { error: "PDF no disponible. Reintenta en unos segundos o contacta soporte." },
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
