import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getKnowledgeBase, setKnowledgeBase, KNOWLEDGE_BASE_MAX_CHARS } from "../../../../lib/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PDF_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo PDF requerido" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "El PDF pesa demasiado (máximo 4 MB)" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  const anthropic = new Anthropic({ apiKey });

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            {
              type: "text",
              text: "Extrae el contenido de este documento como texto plano, en español, listo para usarse como protocolo interno de un asistente de atención al cliente. Resume solo si el documento es muy largo, priorizando normas, procedimientos, precios y datos concretos. No añadas comentarios tuyos, solo el contenido.",
            },
          ],
        },
      ],
    });

    const block = res.content[0];
    const extraido = block?.type === "text" ? block.text.trim() : "";
    if (!extraido) return NextResponse.json({ error: "No se pudo leer el PDF" }, { status: 422 });

    const actual = await getKnowledgeBase();
    const cabecera = `\n\n### Protocolo: ${file.name} (${new Date().toLocaleDateString("es-ES")})\n`;
    const combinado = (actual + cabecera + extraido).slice(0, KNOWLEDGE_BASE_MAX_CHARS);
    await setKnowledgeBase(combinado);

    return NextResponse.json({ ok: true, knowledgeBase: combinado });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
