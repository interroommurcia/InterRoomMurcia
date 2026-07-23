import { NextRequest, NextResponse } from "next/server";
import { eliminarIngreso } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await eliminarIngreso(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
