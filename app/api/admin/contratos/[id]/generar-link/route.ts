import { NextRequest, NextResponse } from "next/server";
import { generarLinkFirma } from "../../../../../../lib/contratos";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const c = await generarLinkFirma(id);
    return NextResponse.json(c);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
