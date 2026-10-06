import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
export const maxDuration = 45;

const SYSTEM = `Eres un editor SEO exigente para InterRoom Murcia (habitaciones para estudiantes en Murcia y Cartagena). Auditas artículos ya escritos y detectas debilidades reales. Nunca inventas problemas, nunca eres complaciente. Español directo.

Puntúas de 0 a 10 en cinco criterios y devuelves un JSON puro.`;

function buildPrompt(art: unknown) {
  return `Audita el siguiente artículo (JSON). Devuelve ÚNICAMENTE un JSON con esta forma exacta, sin texto extra:

{
  "puntuacion_global": 0-10 (media ponderada),
  "criterios": {
    "seo_onpage": { "nota": 0-10, "motivo": "una frase concreta" },
    "originalidad": { "nota": 0-10, "motivo": "una frase concreta" },
    "estructura_mobile": { "nota": 0-10, "motivo": "una frase concreta" },
    "cta_marca": { "nota": 0-10, "motivo": "menciones InterRoom + CTAs" },
    "faq_util": { "nota": 0-10, "motivo": "preguntas realistas y respuestas útiles" }
  },
  "riesgos": ["lista corta de problemas graves si los hay, cadenas cortas"],
  "sugerencias_top3": ["3 acciones concretas que más subirían la nota, imperativo"]
}

Criterios:
- seo_onpage: keyword en h1/meta/intro, longitud meta, densidad natural.
- originalidad: ¿suena a IA genérica o hay datos y matices locales de Murcia/Cartagena?
- estructura_mobile: párrafos cortos, escaneable en 390px, sin muros de texto.
- cta_marca: 3+ menciones naturales a InterRoom Murcia, CTA claro.
- faq_util: 5 preguntas que realmente haría un estudiante, respuestas útiles.

Artículo a auditar:
${JSON.stringify(art)}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body?.h1) return NextResponse.json({ error: "Artículo requerido" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey });

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });
    const block = res.content[0];
    const text = block?.type === "text" ? block.text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Respuesta del modelo no parseable" }, { status: 502 });
    const json = JSON.parse(match[0]);
    return NextResponse.json(json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[articulos/revisar]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
