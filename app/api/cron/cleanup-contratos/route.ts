import { NextRequest, NextResponse } from "next/server";
import { purgarPapeleraContratos } from "../../../../lib/contratos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Purga definitiva de la papelera: borra los contratos que llevan más de
// 90 días marcados como eliminados, junto con su PDF en storage.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const borrados = await purgarPapeleraContratos(90);
    return NextResponse.json({ ok: true, borrados });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
