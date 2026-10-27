import { NextResponse } from "next/server";
import { eliminarContrato } from "../../../../../lib/contratos";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await eliminarContrato(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo eliminar el contrato" },
      { status: 500 },
    );
  }
}
