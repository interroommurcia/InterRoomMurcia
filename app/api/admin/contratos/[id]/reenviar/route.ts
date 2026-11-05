import { NextRequest, NextResponse } from "next/server";
import { getContrato, actualizarDatosContrato, descargarPdfContrato } from "../../../../../../lib/contratos";
import { generarYSubirPdfSiProcede } from "../../../../../../lib/contratos-pdf";
import { enviarContratoFirmadoPropietario } from "../../../../../../lib/contratos-email";

export const dynamic = "force-dynamic";

/**
 * Reenvía por email la copia del contrato firmado al propietario, sin
 * necesidad de volver a firmar. Permite corregir el email del propietario
 * (p.ej. si el original rebotó por estar mal escrito): si se envía uno
 * nuevo, se guarda en el contrato y se usa para el reenvío.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let contrato = await getContrato(params.id);
    if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    if (contrato.estado !== "firmado") {
      return NextResponse.json({ error: "El contrato aún no está firmado por ambas partes" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nuevoEmail = typeof body?.email === "string" ? body.email.trim() : "";

    // Corregir y persistir el email del propietario si nos pasan uno nuevo.
    if (nuevoEmail && nuevoEmail.toLowerCase() !== (contrato.datos.propietario?.email ?? "").toLowerCase()) {
      const datos = {
        ...contrato.datos,
        propietario: { ...contrato.datos.propietario, email: nuevoEmail },
      };
      contrato = await actualizarDatosContrato(params.id, datos);
    }

    if (!contrato.datos.propietario?.email?.trim()) {
      return NextResponse.json({ error: "El propietario no tiene email. Escribe uno para reenviar." }, { status: 400 });
    }

    // Reutilizar el PDF ya subido; si no existe, regenerarlo.
    let pdf: Buffer | null = null;
    const almacenado = await descargarPdfContrato(params.id);
    if (almacenado) pdf = Buffer.from(almacenado);
    else pdf = await generarYSubirPdfSiProcede(params.id);

    const r = await enviarContratoFirmadoPropietario(contrato, pdf);
    if (!r.ok) return NextResponse.json({ error: r.error || "No se pudo enviar el email" }, { status: 502 });

    return NextResponse.json({ ok: true, email: contrato.datos.propietario.email });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
