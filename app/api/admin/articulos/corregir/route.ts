import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
export const maxDuration = 60;

const SYSTEM = `Eres un editor SEO exigente de InterRoom Murcia (habitaciones para estudiantes cerca de la UCAM, UMU y UPCT, en Murcia y Cartagena). Tu trabajo es REESCRIBIR un artículo ya existente para subir su nota, sin cambiar de tema.

REGLAS INAMOVIBLES:
- NO cambies el tema ni la intención de búsqueda del artículo.
- La keyword principal indicada DEBE seguir presente en el H1, el meta título y la introducción.
- NO inventes datos: cualquier cifra (precio, fianza, plazo, fecha) o URL de la que no estés seguro NO se afirma; habla en términos generales o añade " [verificar]". En trámites/dinero, un dato falso hace más daño que omitirlo.

OBJETIVO: corrige las debilidades reales (SEO on-page, originalidad con criterio local de Murcia/Cartagena, estructura escaneable en móvil de 390px con párrafos de 2-3 líneas, CTA y marca, FAQ útil).

Tono humano, español de España, cercano. Prohibido: "en el panorama actual", "es importante destacar", "sumérgete", "desbloquea", tríos de adjetivos, emojis decorativos.

Menciona "InterRoom Murcia" de forma natural al menos 3 veces. Nombra de forma natural UMU, UCAM, UPCT, Espinardo, La Merced, Guadalupe y Cartagena (el sitio los enlaza solo: no pongas URLs en el texto).

Estructura: exactamente 4 secciones H2 y exactamente 5 preguntas FAQ.`;

function buildPrompt(art: Record<string, unknown>, revision: unknown) {
  return `Reescribe y mejora el siguiente artículo. Mantén la keyword principal: "${art.keyword ?? ""}".

${revision ? `Auditoría previa (ataca estos puntos flojos):\n${JSON.stringify(revision)}\n\n` : ""}Artículo actual (JSON):
${JSON.stringify({
    meta_title: art.meta_title,
    meta_description: art.meta_description,
    h1: art.h1,
    intro: art.intro,
    sections: (art.sections as Array<Record<string, unknown>>)?.map((s) => ({ h2: s.h2, content: s.content, highlight: s.highlight })),
    cta: art.cta,
    faq: art.faq,
  })}

Devuelve ÚNICAMENTE un objeto JSON con esta forma exacta, sin texto fuera del JSON:
{
  "meta_title": "máximo 60 caracteres, con la keyword",
  "meta_description": "máximo 155 caracteres, con la keyword",
  "h1": "título principal con la keyword",
  "intro": "introducción con gancho, máximo 150 palabras, párrafos cortos",
  "sections": [
    { "h2": "subtítulo", "content": "párrafos cortos separados por doble salto de línea, máximo 120 palabras", "highlight": "dato clave o null" }
  ],
  "cta": "call to action para InterRoom Murcia",
  "faq": [ { "question": "pregunta real de un estudiante", "answer": "respuesta útil, máximo 60 palabras" } ]
}

Requisitos: exactamente 4 secciones y exactamente 5 preguntas FAQ. NO incluyas slug, keyword, fuentes ni imágenes: esos campos se conservan tal cual. Sé conciso.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body?.h1) return NextResponse.json({ error: "Artículo requerido" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey });

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(body, body.revision) }],
    });
    const block = res.content[0];
    const text = block?.type === "text" ? block.text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Respuesta del modelo no parseable" }, { status: 502 });
    const json = JSON.parse(match[0]);
    return NextResponse.json(json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[articulos/corregir]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
