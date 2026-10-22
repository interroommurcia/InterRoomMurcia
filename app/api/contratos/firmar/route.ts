import { NextRequest, NextResponse } from "next/server";
import { firmarContrato, type Firma } from "../../../../lib/contratos";
import { tramitarPostFirma } from "../../../../lib/contratos-postfirma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint PÚBLICO: el propietario firma desde /firmar/[token].
 * Se autentica por el token opaco del contrato. Solo acepta rol
 * "propietario"; la agencia firma desde el panel admin (otra ruta).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  const firma = body?.firma as Firma | undefined;
  if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 400 });
  if (!firma || !firma.mode || !firma.nombre || !firma.dni) {
    return NextResponse.json({ error: "Firma incompleta" }, { status: 400 });
  }
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const actualizado = await firmarContrato(token, "propietario", { ...firma, ip });
    // Dispara PDF + email + Telegram si procede (no bloqueante en errores).
    await tramitarPostFirma(actualizado.id);
    return NextResponse.json({
      ok: true,
      estado: actualizado.estado,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    const status = msg.includes("no encontrado") ? 404 : msg.includes("no admite") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
