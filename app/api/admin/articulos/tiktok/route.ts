import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "edge";
export const maxDuration = 60;

const SYSTEM = `Eres editor viral de TikTok para InterRoom Murcia, que ayuda a estudiantes a encontrar habitaciones cerca de la UCAM, la UMU y la UPCT en Murcia y Cartagena. Escribes guiones de TikTok con un objetivo: PARAR EL SCROLL en el primer segundo y llevar tráfico a la web. Escribes en el idioma que se te indique como HABLANTE NATIVO de ese idioma, NUNCA traduciendo: redactas de cero, con expresiones propias del idioma, para que no se note que lo hace una IA.

Cómo escribes los ganchos (las "diapositivas"):
- El PRIMER gancho es un titular de telediario: novedad, cifra, urgencia o pregunta que golpea. Ejemplos de estilo: de "abono transporte" → "Nuevas bonificaciones al abono transporte"; de "empadronarse" → "Esto nadie te lo cuenta al llegar a Murcia"; de "fianza" → "Cuidado con la fianza de tu piso".
- Formato titular: concreto y con gancho, NO descriptivo ni genérico. Mal: "Información sobre el transporte". Bien: "El bus te sale gratis siendo estudiante".
- Cortos: máximo 8 palabras. Sin punto final. Sin emojis ni hashtags dentro de las diapositivas.
- Cada gancho siguiente aporta un dato o beneficio nuevo y mantiene la tensión; el último empuja a entrar en la web.
- Cercano y nativo. Prohibido sonar a IA, a folleto o a traducción: en español nada de "en el panorama actual", "descubre", "sumérgete", "desbloquea", tríos de adjetivos; en inglés nada de "dive in", "unlock", "elevate", "in today's world", "game-changer", "buckle up", ni calcos del español.

Regla crítica (no inventar): el impacto sale de REDACTAR fuerte lo que ya dice el artículo, nunca de inventar. No metas cifras, precios, plazos ni "novedades" que el artículo no afirme. Si no hay dato concreto, usa gancho de curiosidad o pregunta, no un número falso.

El copy del post acaba invitando a entrar en la web por el enlace de la bio.`;

function instruccionIdioma(lang: string) {
  if (lang === "es")
    return `IDIOMA: escribe TODO el guion (slides, caption, hashtags) en ESPAÑOL de España, nativo y cercano.`;
  if (lang === "en")
    return `IDIOMA: escribe TODO el guion (slides, caption, hashtags) en INGLÉS nativo y natural (como un creador angloparlante real, p. ej. para estudiantes Erasmus/internacionales). NO traduzcas del español: redacta de cero. Mantén los hashtags de lugar (#murcia, #ucam, #umu, #upct, #cartagena) aunque el resto esté en inglés.`;
  return `IDIOMA: detecta el idioma del ARTÍCULO (por su título e intro) y escribe TODO el guion (slides, caption, hashtags) en ESE mismo idioma, como hablante nativo, sin traducir. Si el artículo está en inglés → inglés nativo; si está en español → español de España. Mantén siempre los hashtags de lugar (#murcia, #ucam, #umu, #upct, #cartagena).`;
}

function buildPrompt(a: {
  h1: string;
  intro: string;
  keyword: string | null;
  h2s: string[];
  url: string;
  lang: string;
}) {
  return `A partir de este artículo del blog, crea el guion de un TikTok vertical (slideshow) que lleve a la gente a leerlo.

${instruccionIdioma(a.lang)}

TÍTULO: ${a.h1}
KEYWORD: ${a.keyword ?? "(ninguna)"}
INTRO: ${a.intro}
SECCIONES: ${a.h2s.map((h) => `- ${h}`).join("\n")}
URL DEL ARTÍCULO: ${a.url}

Devuelve ÚNICAMENTE un objeto JSON (sin texto fuera del JSON) con esta estructura exacta:

{
  "slides": [
    { "text": "Gancho (máx 8 palabras)", "broll": "english stock-video search query for the background" }
  ],
  "caption": "Texto del post para TikTok, máximo 150 caracteres, cercano, termina invitando a entrar por el link de la bio",
  "hashtags": ["#murcia", "#pisoestudiantes", "..."]
}

Para cada "broll": término CORTO en INGLÉS (2-4 palabras) de un banco de vídeo, que muestre una secuencia real relacionada con ese gancho: ciudad, calle, transporte o acción cotidiana de estudiante. Ejemplos: "spain city street", "student riding bus", "handing over keys", "young people apartment", "university campus walking", "counting money". Evita términos abstractos; busca algo que exista como clip de vídeo.

Requisitos ESTRICTOS: entre 4 y 6 "slides"; la PRIMERA es el titular más potente que pare el scroll en 1 segundo (tipo "Nuevas bonificaciones al abono transporte"), no una frase descriptiva. Máximo 8 palabras por slide. Entre 6 y 10 hashtags, en minúsculas, mezcla locales (murcia, cartagena, ucam, umu, upct) y de nicho (pisocompartido, alquilerestudiantes, viviruniversidad). Sé conciso.`;
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
      model: "claude-sonnet-5-5",
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
            lang: body.lang === "es" || body.lang === "en" ? body.lang : "auto",
          }),
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text");
    const raw = text && text.type === "text" ? text.text : "";
    const data = parseJson(raw);

    type RawSlide = string | { text?: string; broll?: string };
    const slides = (data.slides ?? [])
      .map((s: RawSlide) =>
        typeof s === "string"
          ? { text: s, broll: "" }
          : { text: (s.text ?? "").trim(), broll: (s.broll ?? "").trim() }
      )
      .filter((s: { text: string }) => s.text)
      .slice(0, 6);

    return NextResponse.json({
      slides,
      caption: data.caption ?? "",
      hashtags: (data.hashtags ?? []).filter(Boolean).slice(0, 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[articulos/tiktok]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
