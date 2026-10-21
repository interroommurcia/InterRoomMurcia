import { NextResponse } from "next/server";
import { exportarLeadsProximamenteSinLimpiar } from "../../../../../lib/leadsProximamente";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Backup crudo de leads_proximamente (no ejecuta la limpieza automática).
// Devuelve JSON con todos los campos, incluidos los de la migración.
export async function GET() {
  try {
    const rows = await exportarLeadsProximamenteSinLimpiar();
    const payload = {
      exported_at: new Date().toISOString(),
      count: rows.length,
      leads: rows,
    };
    const nombre = `leads-proximamente-backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
