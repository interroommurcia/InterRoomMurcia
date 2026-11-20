import { NextRequest, NextResponse } from "next/server";
import { moverContratoAPapelera, eliminarContrato } from "../../../../../lib/contratos";

export const dynamic = "force-dynamic";

// Por defecto, mover a la papelera (borrado suave). Con ?permanente=1 se
// borra definitivamente (se usa desde la papelera).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const permanente = req.nextUrl.searchParams.get("permanente") === "1";
  try {
    if (permanente) await eliminarContrato(id);
    else await moverContratoAPapelera(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo eliminar el contrato" },
      { status: 500 },
    );
  }
}
