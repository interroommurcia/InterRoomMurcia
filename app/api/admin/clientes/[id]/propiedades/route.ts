import { NextRequest, NextResponse } from "next/server";
import { listarPropiedadesDeCliente } from "../../../../../../lib/propiedades";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await listarPropiedadesDeCliente(params.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
