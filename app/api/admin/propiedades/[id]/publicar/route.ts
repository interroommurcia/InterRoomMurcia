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
  const { habitacion_id, zona, slug, titulo, barrio, precio_mes, metros, descripcion, categoria: catRaw, foto_ids } = body as Record<string, unknown>;
  const categoria = catRaw === "compraventa" ? "compraventa" : "alquiler";
  const zonaStr = String(zona || "") || slugify(String(barrio || "general")).slice(0, 40) || "general";
  if (!titulo || !barrio || !descripcion || !precio_mes) return NextResponse.json({ error: "faltan datos" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const baseQ = () => {
    let q = admin.from("propiedad_media").select("id").eq("propiedad_id", params.id);
    if (habitacion_id) q = q.eq("habitacion_id", String(habitacion_id));
    else q = q.is("habitacion_id", null);
    return q;
  };

  let fotos: { id: string }[] | null;
  if (Array.isArray(foto_ids) && foto_ids.length > 0) {
    const { data } = await admin.from("propiedad_media").select("id").eq("propiedad_id", params.id).eq("tipo", "foto").in("id", foto_ids as string[]).order("orden");
    fotos = data;
  } else {
    const { data } = await baseQ().eq("tipo", "foto").order("orden");
    fotos = data;
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
      disponible: true,
      imageUrl,
      gallery,
      videoUrl,
      categoria,
    });
    revalidatePath("/");
    revalidatePath(`/habitaciones/${zonaStr}`);
    revalidatePath(`/habitaciones/${zonaStr}/${slugFinal}`);
    return NextResponse.json({ ok: true, slug: slugFinal, zona: zonaStr, url: `/habitaciones/${zonaStr}/${slugFinal}` });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
