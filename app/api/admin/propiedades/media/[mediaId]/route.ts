import { NextRequest, NextResponse } from "next/server";
import { eliminarMedia } from "../../../../../../lib/propiedades";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { mediaId: string } }) {
  try {
    await eliminarMedia(params.mediaId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
