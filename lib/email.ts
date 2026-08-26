import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "InterRoom Murcia <onboarding@resend.dev>";

export async function enviarEmailBienvenida(
  destinatario: string,
  nombre: string,
  rol: "admin" | "comercial",
  passwordTemporal: string,
  loginUrl: string,
) {
  const rolLabel = rol === "admin" ? "Administrador" : "Comercial";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ea6a12,#c2410c);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Inter<span style="opacity:0.85;">Room</span> Murcia
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
                Panel de gestión
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 8px;letter-spacing:-0.01em;">
                ¡Bienvenido/a, ${nombre}!
              </h1>
              <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 24px;">
                Se ha creado tu cuenta de <strong style="color:#ea6a12;">${rolLabel}</strong> en el backoffice de InterRoom Murcia. Ya puedes acceder al panel con las siguientes credenciales:
              </p>

              <!-- Credentials card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:12px;color:#9a3412;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:12px;">
                          Tus credenciales
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:8px;">
                          <span style="font-size:13px;color:#6b7280;">Email:</span>
                          <span style="font-size:14px;color:#111827;font-weight:500;margin-left:8px;">${destinatario}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size:13px;color:#6b7280;">Contraseña:</span>
                          <span style="font-size:14px;color:#111827;font-weight:600;margin-left:8px;font-family:monospace;background:#fef3c7;padding:2px 8px;border-radius:4px;">${passwordTemporal}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background:#ea6a12;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.01em;">
                      Acceder al panel
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0;border-top:1px solid #f3f4f6;padding-top:16px;">
                Te recomendamos cambiar la contraseña después de tu primer inicio de sesión. Si no solicitaste esta cuenta, ignora este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #f3f4f6;">
              <div style="font-size:12px;color:#9ca3af;line-height:1.5;">
                InterRoom Murcia · Habitaciones para estudiantes<br />
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

  const { error } = await resend.emails.send({
    from: FROM,
    to: destinatario,
    subject: `Bienvenido/a a InterRoom Murcia — Tu cuenta de ${rolLabel}`,
    html,
  });

  if (error) throw new Error(`Error enviando email: ${error.message}`);
}

export async function enviarEmailReset(destinatario: string, resetUrl: string) {
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
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 20px;">
              <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 12px;">
                Restablecer contraseña
              </h1>
              <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 24px;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva contraseña:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:12px 32px;background:#ea6a12;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0;border-top:1px solid #f3f4f6;padding-top:16px;">
                Este enlace caduca en 1 hora. Si no solicitaste este cambio, ignora este correo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;border-top:1px solid #f3f4f6;">
              <div style="font-size:12px;color:#9ca3af;">InterRoom Murcia</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: destinatario,
    subject: "Restablecer contraseña — InterRoom Murcia",
    html,
  });

  if (error) throw new Error(`Error enviando email: ${error.message}`);
}
