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

  const system = `Eres redactor inmobiliario de InterRoom Murcia. Escribes descripciones de anuncios atractivas, claras y creíbles, en español. REGLA CRÍTICA: usa SOLO los datos que te doy; NUNCA inventes metros, características, electrodomésticos, distancias ni servicios que no aparezcan. Si falta un dato, no lo menciones. No inventes precios. No menciones datos privados (propietario, costes internos, nombres de inquilinos).`;

  const prompt = `Redacta la descripción de este anuncio para la web de InterRoom Murcia.

DATOS REALES:
${hechos}

FORMATO:
- Un párrafo de apertura atractivo (2-3 frases).
- Luego 2-4 bloques cortos con un emoji y un título (p. ej. "🛏️ Interior", "☀️ Exterior", "📍 Ubicación") y debajo líneas breves (una característica por línea), SOLO con los datos dados.
- Cierre de una frase que invite a contactar.
- Tono cercano y profesional. Entre 120 y 220 palabras. Sin markdown, solo texto con saltos de línea.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: prompt }],
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
