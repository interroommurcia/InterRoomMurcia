import { NextResponse } from "next/server";
import { auditarContenido } from "../../../../../lib/seo/auditoria";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await auditarContenido());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
