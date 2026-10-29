import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

type ImagenBase64 = { data: string; mediaType: string };

const MAX_IMAGENES = 8;
const MEDIA_TYPES_OK = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function siNo(v: unknown): "sí" | "no" | null {
  if (v === true || v === "si" || v === "sí" || v === "true") return "sí";
  if (v === false || v === "no" || v === "false") return "no";
  return null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const imagenes: ImagenBase64[] = Array.isArray(body.images)
    ? (body.images as ImagenBase64[])
        .filter((i) => i && typeof i.data === "string" && MEDIA_TYPES_OK.has(i.mediaType))
        .slice(0, MAX_IMAGENES)
    : [];
  const imageUrls: string[] = Array.isArray(body.imageUrls)
    ? (body.imageUrls as unknown[]).filter((u): u is string => typeof u === "string").slice(0, MAX_IMAGENES)
    : [];

  if (imagenes.length === 0 && imageUrls.length === 0) {
    return NextResponse.json({ error: "Añade al menos una foto para generar la descripción" }, { status: 400 });
  }

  const habitaciones = body.habitaciones != null && body.habitaciones !== "" ? Number(body.habitaciones) : null;
  const banos = body.banos != null && body.banos !== "" ? Number(body.banos) : null;
  const ascensor = siNo(body.ascensor);
  const garaje = siNo(body.garaje);
  const terraza = siNo(body.terraza);

  const categoria = body.categoria === "compraventa" ? "compraventa" : "alquiler";
  const tipoAlquiler = body.tipoAlquiler === "habitacion" ? "habitacion" : "completo";

  const datos: string[] = [];
  if (body.titulo) datos.push(`Título: ${String(body.titulo).slice(0, 150)}`);
  if (body.barrio) datos.push(`Barrio/localidad: ${String(body.barrio).slice(0, 120)}`);
  if (body.zona) datos.push(`Zona: ${String(body.zona).slice(0, 60)}`);
  datos.push(`Operación: ${categoria === "compraventa" ? "compraventa" : tipoAlquiler === "habitacion" ? "alquiler de habitación" : "alquiler de piso completo"}`);
  if (body.precioMes) datos.push(`Precio: ${Number(body.precioMes)}€${categoria === "alquiler" ? "/mes" : ""}`);
  if (body.metros) datos.push(`Metros cuadrados: ${Number(body.metros)} m²`);
  if (habitaciones != null) datos.push(`Número de habitaciones: ${habitaciones}`);
  if (banos != null) datos.push(`Número de baños: ${banos}`);
  if (ascensor) datos.push(`Ascensor: ${ascensor}`);
  if (garaje) datos.push(`Garaje: ${garaje}`);
  if (terraza) datos.push(`Terraza: ${terraza}`);

  const system = `Eres un redactor inmobiliario de InterRoom Murcia. Escribes descripciones de inmuebles atractivas, cálidas y profesionales, en español de España.

REGLAS:
- Describe el inmueble basándote SOLO en lo que realmente se ve en las fotos y en los datos facilitados. NUNCA inventes características, estancias, electrodomésticos, orientación, cifras ni servicios que no aparezcan.
- Usa los datos de habitaciones, baños, ascensor, garaje y terraza tal como se indican. Si un dato no se facilita, no lo menciones (no afirmes que "no tiene").
- Un solo párrafo corrido (o dos como máximo), entre 90 y 160 palabras. Sin títulos, sin viñetas, sin markdown, sin emojis.
- Tono vendedor pero honesto, pensado para estudiantes/inquilinos o compradores según la operación.
- Devuelve ÚNICAMENTE el texto de la descripción, sin comillas ni preámbulos.`;

  const content: Anthropic.ContentBlockParam[] = [];
  for (const img of imagenes) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType as "image/jpeg", data: img.data },
    });
  }
  for (const url of imageUrls) {
    content.push({ type: "image", source: { type: "url", url } });
  }
  content.push({
    type: "text",
    text: `Redacta la descripción de este inmueble a partir de las fotos y estos datos:\n${datos.join("\n")}`,
  });

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages: [{ role: "user", content }],
    });
    const descripcion = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!descripcion) return NextResponse.json({ error: "La IA no devolvió texto" }, { status: 502 });
    return NextResponse.json({ descripcion: descripcion.slice(0, 2000) });
  } catch (err) {
    console.error("Error generando descripción", err);
    return NextResponse.json({ error: "No se pudo generar la descripción" }, { status: 500 });
  }
}
