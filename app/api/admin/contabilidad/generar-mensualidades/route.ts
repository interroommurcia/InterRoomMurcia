import { NextResponse } from "next/server";
import { generarMensualidadesPendientes } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json(await generarMensualidadesPendientes());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
