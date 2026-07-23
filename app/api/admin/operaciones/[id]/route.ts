import { NextRequest, NextResponse } from "next/server";
import { eliminarOperacion } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarOperacion(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
