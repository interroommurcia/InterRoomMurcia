import { NextRequest, NextResponse } from "next/server";
import { crearPiso, subirImagenPiso } from "../../../../lib/pisosAdmin";
import type { ZonaSlug } from "../../../../lib/pisos";

export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const slug = slugify(String(form.get("slug") || ""));
  const titulo = String(form.get("titulo") || "").trim().slice(0, 150);
  const zona = String(form.get("zona") || "");
  const barrio = String(form.get("barrio") || "").trim().slice(0, 120);
  const precioMes = Number(form.get("precioMes"));
  const metrosRaw = form.get("metros");
  const metros = metrosRaw && metrosRaw !== "" ? Number(metrosRaw) : null;
  const descripcion = String(form.get("descripcion") || "").trim().slice(0, 2000);
  const disponible = form.get("disponible") === "true";
  const categoriaRaw = String(form.get("categoria") || "alquiler");
  const categoria = (categoriaRaw === "compraventa" ? "compraventa" : "alquiler") as import("../../../../lib/pisos").CategoriaPiso;
  const imagen = form.get("imagen");

  const zonaFinal = zona || slugify(barrio || "general").slice(0, 40) || "general";
  if (!slug || !titulo || !barrio || !precioMes || !descripcion) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  try {
    let imageUrl: string | null = null;
    const imagen = form.get("imagen");
    if (imagen instanceof File && imagen.size > 0) {
      imageUrl = await subirImagenPiso(imagen);
    } else {
      const imgUrl = form.get("imagen_url");
      if (typeof imgUrl === "string" && imgUrl) imageUrl = imgUrl;
    }

    const galleryRaw = form.get("gallery_urls");
    const gallery: string[] = galleryRaw ? JSON.parse(String(galleryRaw)) : [];

    const videoUrlRaw = form.get("video_url");
    const videoUrl = typeof videoUrlRaw === "string" && videoUrlRaw ? videoUrlRaw : null;

    await crearPiso({
      slug,
      titulo,
      zona: zonaFinal as ZonaSlug,
      barrio,
      precioMes,
      metros,
      descripcion,
      disponible,
      imageUrl,
      gallery,
      videoUrl,
      categoria,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error creando piso", err);
    return NextResponse.json({ error: "No se pudo guardar el piso" }, { status: 500 });
  }
}
