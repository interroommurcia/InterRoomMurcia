import { NextRequest, NextResponse } from "next/server";
import { listarConversaciones, marcarLeido } from "../../../../lib/chat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversaciones = await listarConversaciones();
    return NextResponse.json(conversaciones);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, leido } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  try {
    await marcarLeido(id, Boolean(leido));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
