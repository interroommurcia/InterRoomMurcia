import { NextResponse } from "next/server";
import { leadsStats } from "../../../../lib/leads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await leadsStats();
    return NextResponse.json(stats);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
