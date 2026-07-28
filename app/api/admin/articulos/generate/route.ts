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

function esComparativa(keyword: string) {
  return /\b(vs|versus|o|contra|diferencia|diferencias|comparativa)\b/i.test(keyword);
}

function buildPrompt(keyword: string, tone: string, material: string | null) {
  if (esComparativa(keyword)) return buildPromptComparativa(keyword, tone, material);
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
      "imagePrompt": "Photorealistic professional photography prompt in English for this section. Anchor it in a REAL Murcia or Cartagena location relevant to the section content (Guadalupe residential street, La Ñora village, Espinardo university campus buildings, La Merced historic quarter of Murcia, Cartagena old town near the university, Murcia cathedral surroundings, Segura riverside, palm-lined avenues typical of the Region of Murcia). Mediterranean warm sunlight, terracotta and ochre tones, no text, no logos, no visible faces."
    }
  ],
  "cta": "Texto del Call to Action principal para InterRoom Murcia",
  "faq": [
    {
      "question": "Pregunta exacta que haría un estudiante real en Google o ChatGPT",
      "answer": "Respuesta concisa, útil y con mención natural a InterRoom Murcia cuando aplique"
    }
  ],
  "heroImagePrompt": "Stunning photorealistic hero image prompt in English. MUST be anchored in a REAL, iconic location of Murcia or Cartagena that fits the article (Murcia cathedral square, Cartagena Roman theatre, UCAM Guadalupe campus, UMU Espinardo campus, UPCT Cartagena buildings, Segura river promenade, palm-lined Murcia streets, Mediterranean rooftops). Warm golden-hour Mediterranean light, terracotta and ochre palette, ultra high quality 8K, no text, no logos, no visible faces."
}

Requisitos ESTRICTOS: exactamente 4 secciones H2 (ni más ni menos), exactamente 5 preguntas FAQ (ni más ni menos), menciona "InterRoom Murcia" al menos 3 veces. Cada sección: content máximo 120 palabras, párrafos de 2-3 líneas. imagePrompt breve (máximo 20 palabras). Respuestas FAQ máximo 60 palabras. Sé conciso.`;
}

function buildPromptComparativa(keyword: string, tone: string, material: string | null) {
  return `La keyword "${keyword}" es una COMPARATIVA. El usuario está evaluando dos opciones y necesita decidir. Genera un artículo con formato comparativa. Tono: ${tone}.

${material ? `MATERIAL DE REFERENCIA:\n${material}\n\n` : ""}Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin texto extra fuera del JSON):

{
  "slug": "slug-seo-del-articulo",
  "metaTitle": "Título SEO de máximo 60 caracteres con las dos opciones comparadas",
  "metaDescription": "Descripción SEO de máximo 155 caracteres que promete resolver la duda",
  "h1": "Título con las dos opciones y palabra 'comparativa' o 'diferencias'",
  "intro": "Plantea la duda del lector en 2-3 frases y anuncia que el artículo la resuelve. Máximo 120 palabras.",
  "sections": [
    {
      "h2": "Opción A: qué es y para quién (nombre real de la primera opción)",
      "content": "Describe la opción A con datos concretos: precio típico, ventajas reales, contras. Párrafos de 2-3 líneas.",
      "highlight": "Un dato o precio típico de la opción A",
      "imagePrompt": "Prompt en inglés anclado en Murcia/Cartagena representando la opción A. Warm Mediterranean light, no text, no faces."
    },
    {
      "h2": "Opción B: qué es y para quién (nombre real de la segunda opción)",
      "content": "Describe la opción B con datos concretos. Simétrica a la A para que se pueda comparar de un vistazo.",
      "highlight": "Un dato o precio típico de la opción B",
      "imagePrompt": "Prompt en inglés anclado en Murcia/Cartagena representando la opción B. Warm Mediterranean light, no text, no faces."
    },
    {
      "h2": "Comparativa punto por punto",
      "content": "Comparación en formato listable escrito con guiones al inicio de cada línea: '- Precio: A cuesta X, B cuesta Y'; '- Privacidad: A ofrece..., B ofrece...'; cubre precio, privacidad, servicios incluidos, contrato, cercanía al campus, vida social. Un guion por línea.",
      "highlight": null,
      "imagePrompt": "Prompt en inglés de una calle o barrio de Murcia/Cartagena que evoque la elección."
    },
    {
      "h2": "Cuál te conviene según tu perfil",
      "content": "Recomendación por perfiles: 'Si buscas X, la opción A'; 'Si priorizas Y, la B'. Cierra con la propuesta de InterRoom Murcia como filtro para acertar.",
      "highlight": "Regla de oro para decidir en una frase.",
      "imagePrompt": "Prompt en inglés de un estudiante llegando a Murcia (sin verse la cara), maletas o mochila, luz cálida."
    }
  ],
  "cta": "CTA que invita a hablar con InterRoom Murcia si aún no lo tiene claro.",
  "faq": [
    { "question": "Pregunta real que haría un estudiante indeciso entre A y B", "answer": "Respuesta concreta, menciona InterRoom cuando aporte." }
  ],
  "heroImagePrompt": "Prompt fotográfico en inglés anclado en Murcia o Cartagena, evocando decisión entre dos opciones (por ejemplo, calle con dos caminos, mirador de la ciudad, ambiente universitario). Luz mediterránea dorada, paleta terracota, 8K, no text, no logos, no visible faces."
}

Requisitos ESTRICTOS: exactamente 4 secciones H2 con esos títulos, exactamente 5 preguntas FAQ, menciona "InterRoom Murcia" al menos 3 veces. Sé concreto: nombres reales, precios orientativos, nunca genéricos. Cada sección máximo 130 palabras.`;
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
