import { NextRequest, NextResponse } from "next/server";
import { getContratoPorResendId, actualizarEmailEstadoContrato } from "../../../../lib/contratos";
import { avisarAdminEmailProblema } from "../../../../lib/contratos-postfirma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Resend para enterarse de rebotes/quejas del email del contrato.
 * Auth sencilla por token en la URL (?token=…): configura en Resend la URL
 * .../api/webhooks/resend?token=$RESEND_WEBHOOK_TOKEN. Siempre responde 200
 * salvo que falle el token, para que Resend no reintente en bucle.
 */
export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  const esperado = process.env.RESEND_WEBHOOK_TOKEN;
  if (!esperado || token !== esperado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const evento = await req.json().catch(() => null);
    const tipo: string = evento?.type || "";
    const emailId: string | undefined = evento?.data?.email_id || evento?.data?.id;
    if (!emailId) return NextResponse.json({ ok: true });

    const contrato = await getContratoPorResendId(emailId);
    if (!contrato) return NextResponse.json({ ok: true });

    if (tipo === "email.delivered") {
      await actualizarEmailEstadoContrato(contrato.id, { email_estado: "entregado", email_error: null });
    } else if (tipo === "email.bounced") {
      const motivo = evento?.data?.bounce?.message || evento?.data?.reason || "El email rebotó (dirección inexistente o rechazada).";
      await actualizarEmailEstadoContrato(contrato.id, { email_estado: "rebotado", email_error: String(motivo).slice(0, 500) });
      await avisarAdminEmailProblema(contrato, `El email REBOTÓ: ${motivo}`).catch(() => undefined);
    } else if (tipo === "email.complained") {
      await actualizarEmailEstadoContrato(contrato.id, { email_estado: "queja", email_error: "El destinatario marcó el email como spam." });
      await avisarAdminEmailProblema(contrato, "El destinatario marcó el email como spam.").catch(() => undefined);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[resend webhook]", e);
    return NextResponse.json({ ok: true });
  }
}
