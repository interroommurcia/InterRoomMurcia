import { NextRequest, NextResponse } from "next/server";
import { eliminarLeadProximamente, marcarLeadProximamenteContactado } from "../../../../../lib/leadsProximamente";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  if (typeof body?.contactado !== "boolean") return NextResponse.json({ error: "contactado (boolean) requerido" }, { status: 400 });
  try {
    await marcarLeadProximamenteContactado(id, body.contactado);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  try {
    await eliminarLeadProximamente(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
