import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { getKnowledgeBase, setKnowledgeBase, KNOWLEDGE_BASE_MAX_CHARS } from "../../../../lib/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  if (!ACCEPTED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Solo se aceptan archivos PDF o Word (.docx)" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "El archivo pesa demasiado (máximo 4 MB)" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf";

  let extraido = "";

  if (isPdf) {
    const anthropic = new Anthropic({ apiKey });
    const base64 = bytes.toString("base64");
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
      extraido = block?.type === "text" ? block.text.trim() : "";
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    try {
      extraido = await extractDocx(bytes);
    } catch {
      return NextResponse.json({ error: "No se pudo leer el archivo Word" }, { status: 422 });
    }
  }

  if (!extraido) return NextResponse.json({ error: "No se pudo extraer texto del archivo" }, { status: 422 });

  const ext = isPdf ? "PDF" : "DOCX";
  const cabecera = `### Protocolo: ${file.name} [${ext}] (${new Date().toLocaleDateString("es-ES")})\n`;
  const nuevo = (cabecera + extraido).slice(0, KNOWLEDGE_BASE_MAX_CHARS);
  await setKnowledgeBase(nuevo);

  return NextResponse.json({ ok: true, knowledgeBase: nuevo });
}

export async function GET() {
  const kb = await getKnowledgeBase();
  if (!kb.trim()) return NextResponse.json({ error: "No hay protocolo guardado" }, { status: 404 });

  const lines = kb.split("\n");
  const children = lines.map((line) => {
    const trimmed = line.trim();
    if (/^#{1,3}\s/.test(trimmed)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: trimmed.replace(/^#{1,3}\s*/, ""), bold: true })],
      });
    }
    return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: trimmed })] });
  });

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": "attachment; filename=Protocolo_Roomi.docx",
    },
  });
}
