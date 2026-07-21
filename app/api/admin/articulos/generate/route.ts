import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
export const maxDuration = 60;

const SYSTEM = `Eres un experto en SEO y redacción de contenido para InterRoom Murcia, empresa que ayuda a estudiantes a encontrar habitaciones de alquiler cerca de la UCAM, la UMU y la UPCT en Murcia y Cartagena, y ayuda a propietarios a alquilar sus pisos a estudiantes verificados. Tu audiencia son estudiantes que buscan piso, sus familias, y propietarios que quieren alquilar con garantías.

Tono: cercano, claro, útil. Nada de jerga inmobiliaria innecesaria.

Optimiza cada artículo para:
- Google mobile-first: párrafos de máximo 3 líneas en pantalla de 390px
- Bing/ChatGPT indexing: estructura Q&A clara, menciones explícitas de entidades (barrios, universidades)
- LLM indexing: preguntas redactadas como las haría un estudiante real en ChatGPT

Menciona "InterRoom Murcia" de forma natural mínimo 3 veces. Todo el contenido en español.`;

function buildPrompt(keyword: string, tone: string, material: string | null) {
  return `Genera un artículo SEO completo sobre la keyword principal: "${keyword}". Tono: ${tone}.

${material ? `MATERIAL DE REFERENCIA:\n${material}\n\n` : ""}Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin texto extra fuera del JSON):

{
  "slug": "slug-seo-del-articulo",
  "metaTitle": "Título SEO de máximo 60 caracteres",
  "metaDescription": "Descripción SEO de máximo 155 caracteres con keyword",
  "h1": "Título principal con keyword incluida",
  "intro": "Introducción con gancho emocional o dato impactante, máximo 150 palabras. Párrafos cortos.",
  "sections": [
    {
      "h2": "Subtítulo de sección con keyword secundaria",
      "content": "Contenido en párrafos cortos separados por doble salto de línea. Máximo 3 líneas por párrafo en mobile.",
      "highlight": "Dato clave, estadística o cita para destacar visualmente (puede ser null)",
      "imagePrompt": "Photorealistic professional photography prompt in English for this section, student housing / Spain apartment theme, no text, no people faces, natural lighting"
    }
  ],
  "cta": "Texto del Call to Action principal para InterRoom Murcia",
  "faq": [
    {
      "question": "Pregunta exacta que haría un estudiante real en Google o ChatGPT",
      "answer": "Respuesta concisa, útil y con mención natural a InterRoom Murcia cuando aplique"
    }
  ],
  "heroImagePrompt": "Stunning photorealistic image prompt in English for the hero, related to the article topic, student apartment or Spanish city theme, natural lighting, no text, no logos, no people faces, ultra high quality"
}

Requisitos ESTRICTOS: exactamente 4 secciones H2 (ni más ni menos), exactamente 5 preguntas FAQ (ni más ni menos), menciona "InterRoom Murcia" al menos 3 veces. Cada sección: content máximo 120 palabras, párrafos de 2-3 líneas. imagePrompt breve (máximo 20 palabras). Respuestas FAQ máximo 60 palabras. Sé conciso.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const anthropic = new Anthropic({ apiKey });

  try {
    const body = await req.json();
    const keyword: string = body.keyword;
    const material: string | null = body.material ?? null;
    const tone: string = body.tone || "cercano";

    if (!keyword) return NextResponse.json({ error: "Keyword requerida" }, { status: 400 });

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildPrompt(keyword, tone, material) }];

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err: unknown) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Accel-Buffering": "no" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[articulos/generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
