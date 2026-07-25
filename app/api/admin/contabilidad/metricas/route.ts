import { NextRequest, NextResponse } from "next/server";
import { metricasAnuales } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const anioParam = req.nextUrl.searchParams.get("anio");
    const anio = anioParam ? Number(anioParam) : new Date().getFullYear();
    return NextResponse.json(await metricasAnuales(anio));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
