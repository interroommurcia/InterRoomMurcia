import { NextResponse } from "next/server";
import { migrarLeadsProximamenteAPipeline } from "../../../../../lib/leadsProximamente";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Mueve los leads de próximamente al pipeline normal (leads_propietarios),
// preservando created_at y datos del piso en el mensaje. Idempotente: cada
// origen queda marcado con migrated_at para evitar duplicados.
export async function POST() {
  try {
    const resultado = await migrarLeadsProximamenteAPipeline();
    return NextResponse.json(resultado);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
