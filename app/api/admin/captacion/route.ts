import { NextResponse } from "next/server";
import { listarCasas, crearCasa } from "../../../../lib/captacion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarCasas());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST() {
  try {
    return NextResponse.json(await crearCasa());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
