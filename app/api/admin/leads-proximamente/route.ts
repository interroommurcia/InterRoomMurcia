import { NextResponse } from "next/server";
import { getSesion } from "../../../../lib/auth";
import { listarLeadsProximamente } from "../../../../lib/leadsProximamente";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSesion();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const leads = await listarLeadsProximamente();
  return NextResponse.json(leads);
}
