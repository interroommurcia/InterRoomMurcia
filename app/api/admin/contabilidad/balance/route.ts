import { NextResponse } from "next/server";
import { balanceTotal } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await balanceTotal());
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
