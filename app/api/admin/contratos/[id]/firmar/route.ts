import { NextRequest, NextResponse } from "next/server";
import { firmarContrato, getContrato, type Firma } from "../../../../../../lib/contratos";
import { tramitarPostFirma } from "../../../../../../lib/contratos-postfirma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Firma como La Agencia desde el panel admin.
 * El middleware ya exige sesión para /api/admin/*; aquí usamos el token
 * del contrato internamente (si no se ha generado todavía, lo generamos).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const firma = body?.firma as Firma | undefined;
  if (!firma || !firma.mode || !firma.nombre || !firma.dni) {
    return NextResponse.json({ error: "Firma incompleta" }, { status: 400 });
  }

  try {
    const contrato = await getContrato(id);
    if (!contrato) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

    // La agencia puede firmar incluso antes de generar el link público.
    // Si no hay token aún, generamos uno para que el flujo quede consistente.
    let token = contrato.signing_token;
    if (!token) {
      const { generarLinkFirma } = await import("../../../../../../lib/contratos");
      const c2 = await generarLinkFirma(id);
      token = c2.signing_token!;
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const actualizado = await firmarContrato(token, "agencia", { ...firma, ip });
    // Dispara PDF + email + Telegram si procede (no bloqueante en errores).
    const post = await tramitarPostFirma(actualizado.id);
    return NextResponse.json({ ...actualizado, post });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
