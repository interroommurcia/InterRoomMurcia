import { NextResponse } from "next/server";
import { getContrato } from "../../../../../../lib/contratos";
import { renderContratoHtml } from "../../../../../../lib/contratos-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Descarga el contrato como documento Word (.doc) totalmente editable,
 * para poder cambiar o añadir cláusulas de un cliente concreto antes de
 * enviarlo. Se sirve el mismo HTML del contrato con MIME de Word; Word y
 * LibreOffice lo abren como documento editable conservando el formato.
 *
 * Con ?borrador=1 funciona aunque no esté firmado (lo normal para editar).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const esBorrador = new URL(req.url).searchParams.get("borrador") === "1";

  const contrato = await getContrato(id);
  if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

  if (!esBorrador && contrato.estado !== "firmado") {
    return NextResponse.json(
      { error: `El contrato aún no está firmado por ambas partes (estado: ${contrato.estado})` },
      { status: 409 },
    );
  }

  try {
    const html = await renderContratoHtml(contrato);
    const nombre = contrato.datos.propietario?.nombre?.replace(/[^a-zA-Z0-9]/g, "-") || id.slice(0, 8);
    const filename = `contrato-${esBorrador ? "editable" : "firmado"}-${nombre}.doc`;
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: unknown) {
    console.error("[admin word] generación fallida", { contratoId: id, error: e });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo generar el Word" },
      { status: 500 },
    );
  }
}
