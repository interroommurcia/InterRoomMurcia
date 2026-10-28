import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const admin = getSupabaseAdmin();
  const { data: prop } = await admin
    .from("propiedades")
    .select("*, propiedad_habitaciones(nombre, precio)")
    .eq("id", params.id)
    .maybeSingle();
  if (!prop) return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });

  const categoria = body.categoria === "compraventa" ? "compraventa" : "alquiler";
  const tipoAlquiler = body.tipo_alquiler === "habitacion" ? "habitacion" : "completo";
  const titulo = String(body.titulo || prop.nombre || "").trim();
  const barrio = String(body.barrio || prop.direccion || "").trim();
  const precio = body.precio ? Number(body.precio) : prop.precio_total;

  // Hechos reales de la propiedad (nunca inventar nada fuera de esto).
  const servicios = [
    prop.servicio_wifi && "wifi incluido",
    prop.servicio_limpieza && "servicio de limpieza",
    prop.servicio_luz && "luz incluida",
    prop.servicio_agua && "agua incluida",
  ].filter(Boolean) as string[];
  const habitaciones = (prop.propiedad_habitaciones ?? []) as { nombre: string; precio: number | null }[];

  const hechos = [
    `Nombre/título: ${titulo}`,
    `Operación: ${categoria}${categoria === "alquiler" ? ` (${tipoAlquiler === "habitacion" ? "por habitaciones" : "piso completo"})` : ""}`,
    barrio && `Zona/dirección: ${barrio}`,
    prop.tipo && `Tipo: ${prop.tipo}`,
    prop.num_habitaciones ? `Habitaciones: ${prop.num_habitaciones}` : null,
    prop.num_banos ? `Baños: ${prop.num_banos}` : null,
    precio ? `Precio: ${precio}${categoria === "alquiler" ? "€/mes" : "€"}` : null,
    prop.tiene_garaje ? `Garaje${prop.precio_garaje ? ` (${prop.precio_garaje}€)` : ""}` : null,
    servicios.length ? `Incluye: ${servicios.join(", ")}` : null,
    habitaciones.length ? `Habitaciones definidas: ${habitaciones.map((h) => `${h.nombre}${h.precio ? ` ${h.precio}€` : ""}`).join("; ")}` : null,
    prop.notas ? `Notas internas (usa solo datos de la vivienda; ignora cualquier dato privado, de propietario, costes internos o nombres): ${String(prop.notas).slice(0, 800)}` : null,
  ].filter(Boolean).join("\n");

  const system = `Eres redactor inmobiliario de InterRoom Murcia. Escribes descripciones de anuncios atractivas, claras y creíbles, en español. REGLA CRÍTICA: usa SOLO los datos que te doy y lo que se vea CON CLARIDAD en las fotos adjuntas; NUNCA inventes metros, características, electrodomésticos, distancias ni servicios que no aparezcan en los datos ni se vean en las fotos. Si no estás seguro de algo, no lo menciones. No inventes precios. No menciones datos privados (propietario, costes internos, nombres de inquilinos).`;

  // Fotos: se las pasamos a Claude (visión) para que describa lo que SE VE
  // realmente (cocina equipada, piscina, terraza, electrodomésticos…). El
  // bucket es privado, así que las bajamos, comprimimos y mandamos en base64.
  const imageBlocks: Anthropic.ImageBlockParam[] = [];
  try {
    const { data: fotos } = await admin
      .from("propiedad_media")
      .select("storage_path, habitacion_id")
      .eq("propiedad_id", params.id)
      .eq("tipo", "foto")
      .order("orden")
      .limit(20);
    const ordenadas = (fotos ?? []).filter((f) => f.storage_path);
    // Prioriza generales y, si se publica una habitación, la suya; máx. 6.
    ordenadas.sort((a, b) => {
      const pa = a.habitacion_id ? 1 : 0;
      const pb = b.habitacion_id ? 1 : 0;
      return pa - pb;
    });
    const sharp = (await import("sharp")).default;
    for (const f of ordenadas.slice(0, 6)) {
      const { data: blob } = await admin.storage.from("propiedades").download(f.storage_path as string);
      if (!blob) continue;
      const buf = Buffer.from(await blob.arrayBuffer());
      const jpg = await sharp(buf).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
      imageBlocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpg.toString("base64") } });
    }
  } catch {
    // Si falla el procesado de fotos, seguimos con solo los datos.
  }

  const prompt = `Redacta la descripción de este anuncio para la web de InterRoom Murcia.

DATOS REALES:
${hechos}

${imageBlocks.length ? `Te adjunto ${imageBlocks.length} foto(s) reales de la vivienda. Fíjate en ellas para describir SOLO lo que se ve con claridad (tipo de cocina y electrodomésticos, baño, piscina, terraza/patio, suelos, luz natural, estado, mobiliario…). No afirmes nada que no se vea ni calcules medidas.` : ""}

FORMATO:
- Un párrafo de apertura atractivo (2-3 frases).
- Luego 2-4 bloques cortos con un emoji y un título (p. ej. "🛏️ Interior", "☀️ Exterior", "📍 Ubicación") y debajo líneas breves (una característica por línea), con los datos dados y lo que se vea en las fotos.
- Cierre de una frase que invite a contactar.
- Tono cercano y profesional. Entre 120 y 220 palabras. Sin markdown, solo texto con saltos de línea.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt }] }],
    });
    const descripcion = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!descripcion) return NextResponse.json({ error: "No se generó texto" }, { status: 502 });
    return NextResponse.json({ descripcion });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error generando" }, { status: 500 });
  }
}
