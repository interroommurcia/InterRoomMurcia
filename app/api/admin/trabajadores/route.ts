import { NextRequest, NextResponse } from "next/server";
import { listarTrabajadores, crearTrabajador } from "../../../../lib/trabajadores";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarTrabajadores());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  try {
    return NextResponse.json(await crearTrabajador(String(body.nombre)));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
