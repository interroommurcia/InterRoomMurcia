import { NextResponse } from "next/server";
import { restaurarContrato } from "../../../../../../lib/contratos";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await restaurarContrato(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo restaurar el contrato" },
      { status: 500 },
    );
  }
}
