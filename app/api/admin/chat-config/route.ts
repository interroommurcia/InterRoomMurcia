import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeBase, setKnowledgeBase, KNOWLEDGE_BASE_MAX_CHARS } from "../../../../lib/chat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const knowledgeBase = await getKnowledgeBase();
    return NextResponse.json({ knowledgeBase });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { knowledgeBase } = await req.json();
  if (typeof knowledgeBase !== "string") return NextResponse.json({ error: "knowledgeBase requerido" }, { status: 400 });
  try {
    await setKnowledgeBase(knowledgeBase.slice(0, KNOWLEDGE_BASE_MAX_CHARS));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
