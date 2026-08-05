import { NextRequest, NextResponse } from "next/server";
import { marcarCompraventaCobrada } from "../../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const cobrado = !!body?.cobrado;
  try {
    await marcarCompraventaCobrada(params.id, cobrado);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
