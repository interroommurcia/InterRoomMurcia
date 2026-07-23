import { NextRequest, NextResponse } from "next/server";
import { listarClientes, crearCliente } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listarClientes());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre || !body?.tipo) {
    return NextResponse.json({ error: "nombre y tipo son requeridos" }, { status: 400 });
  }
  try {
    const cliente = await crearCliente(body);
    return NextResponse.json(cliente);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
