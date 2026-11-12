import { NextResponse } from "next/server";
import { listarEmailsPendientes, marcarTodosVistos } from "../../../../lib/emailsAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pendientes = await listarEmailsPendientes();
    return NextResponse.json(pendientes);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await marcarTodosVistos();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
