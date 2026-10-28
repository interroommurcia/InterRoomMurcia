import { NextRequest, NextResponse } from "next/server";
import { limpiarLeadsCaducados } from "../../../../lib/leadsCasas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Borra los leads cuyo piso se eliminó del catálogo hace más de 10 días.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const res = await limpiarLeadsCaducados();
    return NextResponse.json({ ok: true, borrados: res });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
