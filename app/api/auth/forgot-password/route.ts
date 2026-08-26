import { NextRequest, NextResponse } from "next/server";
import { generarTokenReset } from "../../../../lib/auth";
import { SITE_URL } from "../../../../lib/site";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const token = await generarTokenReset(email);

  if (token) {
    const resetUrl = `${SITE_URL}/admin/reset-password?token=${token}`;
    try {
      const { enviarEmailReset } = await import("../../../../lib/email");
      await enviarEmailReset(email, resetUrl);
    } catch {
      // Resend no configurado — log del enlace en server
      console.log("[reset-password]", resetUrl);
    }
  }

  return NextResponse.json({ ok: true });
}
