import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import { copiarMediaAPiso } from "../../../../../../lib/propiedades";
import { crearPiso } from "../../../../../../lib/pisosAdmin";
import type { ZonaSlug } from "../../../../../../lib/pisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ZONAS_ALQUILER = ["ucam", "umu", "upct"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  const { habitacion_id, zona, slug, titulo, barrio, precio_mes, metros, descripcion, categoria: catRaw, foto_ids, tipo_alquiler, num_habitaciones, num_banos, estado: estadoRaw } = body as Record<string, unknown>;
  const categoria = catRaw === "compraventa" ? "compraventa" : "alquiler";
  const tipoAlquiler = tipo_alquiler === "habitacion" ? "habitacion" : "completo";
  const zonaStr = String(zona || "") || slugify(String(barrio || "general")).slice(0, 40) || "general";
  if (!titulo || !barrio || !descripcion || !precio_mes) return NextResponse.json({ error: "faltan datos" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const baseQ = () => {
    let q = admin.from("propiedad_media").select("id").eq("propiedad_id", params.id);
    if (habitacion_id) q = q.eq("habitacion_id", String(habitacion_id));
    else q = q.is("habitacion_id", null);
    return q;
  };

  // Fotos base: selección manual, o las de la habitación, o las generales.
  let baseFotos: { id: string }[] | null;
  if (Array.isArray(foto_ids) && foto_ids.length > 0) {
    const { data } = await admin.from("propiedad_media").select("id").eq("propiedad_id", params.id).eq("tipo", "foto").in("id", foto_ids as string[]).order("orden");
    baseFotos = data;
  } else {
    const { data } = await baseQ().eq("tipo", "foto").order("orden");
    baseFotos = data;
  }

  // Fotos complementarias: al publicar una habitación se añaden las generales;
  // al publicar el piso completo se añaden las de todas las habitaciones.
  let extraFotos: { id: string }[] | null = null;
  if (habitacion_id || (Array.isArray(foto_ids) && foto_ids.length > 0)) {
    const { data } = await admin.from("propiedad_media").select("id").eq("propiedad_id", params.id).eq("tipo", "foto").is("habitacion_id", null).order("orden");
    extraFotos = data;
  } else {
    const { data } = await admin.from("propiedad_media").select("id").eq("propiedad_id", params.id).eq("tipo", "foto").not("habitacion_id", "is", null).order("orden");
    extraFotos = data;
  }

  // Combina sin duplicados, conservando el orden (las base primero → portada).
  const vistas = new Set<string>();
  const fotos: { id: string }[] = [];
  for (const f of [...(baseFotos ?? []), ...(extraFotos ?? [])]) {
    if (!vistas.has(f.id)) { vistas.add(f.id); fotos.push(f); }
  }

  const { data: videos } = await baseQ().eq("tipo", "video").order("orden");

  const gallery: string[] = [];
  for (const f of fotos ?? []) {
    const url = await copiarMediaAPiso(f.id);
    if (url) gallery.push(url);
  }
  const imageUrl = gallery[0] ?? null;
  let videoUrl: string | null = null;
  if (videos && videos.length > 0) {
    videoUrl = await copiarMediaAPiso(videos[0].id);
  }

  const slugFinal = slugify(String(slug || titulo)) + "-" + Math.random().toString(36).slice(2, 6);
  try {
    await crearPiso({
      slug: slugFinal,
      titulo: String(titulo),
      zona: zonaStr as ZonaSlug,
      barrio: String(barrio),
      precioMes: Number(precio_mes),
      metros: metros ? Number(metros) : null,
      descripcion: String(descripcion),
      disponible: estadoRaw !== "proximamente",
      reservada: false,
      estado: estadoRaw === "proximamente" ? "proximamente" : "disponible",
      numHabitaciones: num_habitaciones ? Number(num_habitaciones) : null,
      numBanos: num_banos ? Number(num_banos) : null,
      imageUrl,
      gallery,
      videoUrl,
      categoria,
      tipoAlquiler: categoria === "alquiler" ? tipoAlquiler as import("../../../../../../lib/pisos").TipoAlquiler : undefined,
    });
    revalidatePath("/");
    revalidatePath(`/habitaciones/${zonaStr}`);
    revalidatePath(`/habitaciones/${zonaStr}/${slugFinal}`);
    return NextResponse.json({ ok: true, slug: slugFinal, zona: zonaStr, url: `/habitaciones/${zonaStr}/${slugFinal}` });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
