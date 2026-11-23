import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
export const maxDuration = 60;

const SYSTEM = `Eres editor de redes sociales de InterRoom Murcia, que ayuda a estudiantes a encontrar habitaciones cerca de la UCAM, la UMU y la UPCT en Murcia y Cartagena. Escribes guiones de TikTok/Reels en español de España, tono cercano y directo, pensados para enganchar en los 2 primeros segundos y llevar tráfico a la web.

Reglas:
- Ganchos cortísimos (máximo 7 palabras cada uno), de telediario, nada de relleno ni jerga inmobiliaria.
- Español de España, cercano. Prohibido: "en el panorama actual", "sumérgete", "desbloquea", emojis decorativos en las diapositivas.
- NO inventes cifras, precios ni plazos. Si no hay dato seguro, habla en términos generales.
- El copy acaba invitando a entrar en la web por el enlace de la bio.`;

function buildPrompt(a: {
  h1: string;
  intro: string;
  keyword: string | null;
  h2s: string[];
  url: string;
}) {
  return `A partir de este artículo del blog, crea el guion de un TikTok vertical (slideshow) que lleve a la gente a leerlo.

TÍTULO: ${a.h1}
KEYWORD: ${a.keyword ?? "(ninguna)"}
INTRO: ${a.intro}
SECCIONES: ${a.h2s.map((h) => `- ${h}`).join("\n")}
URL DEL ARTÍCULO: ${a.url}

Devuelve ÚNICAMENTE un objeto JSON (sin texto fuera del JSON) con esta estructura exacta:

{
  "slides": ["Gancho 1 (máx 7 palabras)", "Gancho 2", "Gancho 3", "Gancho 4", "Gancho 5"],
  "caption": "Texto del post para TikTok, máximo 150 caracteres, cercano, termina invitando a entrar por el link de la bio",
  "hashtags": ["#murcia", "#pisoestudiantes", "..."]
}

Requisitos ESTRICTOS: entre 4 y 6 "slides"; la primera es el gancho más potente (una pregunta o dato que pare el scroll). Entre 6 y 10 hashtags, en minúsculas, mezcla locales (murcia, cartagena, ucam, umu, upct) y de nicho (pisocompartido, alquilerestudiantes, viviruniversidad). Sé conciso.`;
}

function parseJson(raw: string) {
  const fence = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
  if (fence) return JSON.parse(fence[1]);
  const obj = raw.match(/\{[\s\S]*\}/);
  if (!obj) throw new Error("Respuesta vacía del modelo");
  return JSON.parse(obj[0]);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  try {
    const body = await req.json();
    const h1: string = body.h1;
    if (!h1) return NextResponse.json({ error: "Falta el artículo" }, { status: 400 });

    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: buildPrompt({
            h1,
            intro: body.intro ?? "",
            keyword: body.keyword ?? null,
            h2s: Array.isArray(body.h2s) ? body.h2s : [],
            url: body.url ?? "",
          }),
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text");
    const raw = text && text.type === "text" ? text.text : "";
    const data = parseJson(raw);

    return NextResponse.json({
      slides: (data.slides ?? []).filter(Boolean).slice(0, 6),
      caption: data.caption ?? "",
      hashtags: (data.hashtags ?? []).filter(Boolean).slice(0, 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[articulos/tiktok]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
