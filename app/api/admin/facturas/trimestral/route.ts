import { NextRequest, NextResponse } from "next/server";
import { construirTrimestral } from "../../../../../lib/factura/trimestral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const anio = Number(req.nextUrl.searchParams.get("anio")) || new Date().getFullYear();
    return NextResponse.json(await construirTrimestral(anio));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
