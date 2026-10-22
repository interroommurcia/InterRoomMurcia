import { Resend } from "resend";
import type { Contrato } from "./contratos";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "InterRoom Murcia <onboarding@resend.dev>";

/**
 * Envía por email una copia del contrato firmado al propietario.
 * Attachments: el PDF del contrato. Si falla el email no interrumpe el
 * flujo (se registra el error pero el contrato sigue firmado).
 */
export async function enviarContratoFirmadoPropietario(
  contrato: Contrato,
  pdfBuffer: Buffer,
): Promise<{ ok: boolean; error?: string }> {
  const destinatario = contrato.datos.propietario?.email?.trim();
  if (!destinatario) return { ok: false, error: "El propietario no tiene email en el contrato" };

  const nombre = contrato.datos.propietario?.nombre || "cliente";
  const inmueble = contrato.datos.inmueble?.direccion || "";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#ea6a12,#c2410c);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Inter<span style="opacity:0.85;">Room</span> Murcia
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
                Agencia inmobiliaria
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 20px;">
              <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 12px;letter-spacing:-0.01em;">
                Tu contrato de exclusiva firmado
              </h1>
              <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 16px;">
                Hola ${nombre.split(" ")[0]},
              </p>
              <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 16px;">
                Adjunto encontrarás una copia del <strong>contrato de encargo de venta en exclusiva</strong> firmado por ambas partes. Guárdalo para tu archivo personal.
              </p>
              ${
                inmueble
                  ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin:16px 0 24px;">
                       <tr>
                         <td style="padding:16px 20px;">
                           <div style="font-size:11px;color:#9a3412;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">
                             Inmueble
                           </div>
                           <div style="font-size:14px;color:#111827;font-weight:500;">${inmueble}</div>
                         </td>
                       </tr>
                     </table>`
                  : ""
              }
              <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 24px;">
                A partir de ahora comenzamos la comercialización profesional de tu vivienda. Te mantendremos informado con un reporte mensual.
              </p>
              <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0;border-top:1px solid #f3f4f6;padding-top:16px;">
                Si tienes cualquier duda sobre el contrato, responde a este correo o contacta con nosotros directamente.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #f3f4f6;">
              <div style="font-size:12px;color:#9ca3af;line-height:1.5;">
                InterRoom Murcia · Agencia inmobiliaria<br />
                Murcia · Cartagena
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: destinatario,
      subject: "Tu contrato de exclusiva firmado — InterRoom Murcia",
      html,
      attachments: [
        {
          filename: `contrato-exclusiva-${contrato.id.slice(0, 8)}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
