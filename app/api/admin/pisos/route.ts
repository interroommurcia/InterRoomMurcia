import { NextRequest, NextResponse } from "next/server";
import { crearPiso, subirImagenPiso } from "../../../../lib/pisosAdmin";
import type { ZonaSlug } from "../../../../lib/pisos";

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

  const zonaValida = categoria === "alquiler" ? ZONAS_ALQUILER.includes(zona) : zona.length > 0 && zona.length <= 40;
  if (!slug || !titulo || !zonaValida || !barrio || !precioMes || !descripcion) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  try {
    let imageUrl: string | null = null;
    if (imagen instanceof File && imagen.size > 0) {
      imageUrl = await subirImagenPiso(imagen);
    }

    const gallery: string[] = [];
    for (const entry of form.getAll("galeria")) {
      if (entry instanceof File && entry.size > 0) {
        gallery.push(await subirImagenPiso(entry));
      }
    }

    let videoUrl: string | null = null;
    const video = form.get("video");
    if (video instanceof File && video.size > 0) {
      videoUrl = await subirImagenPiso(video);
    }

    await crearPiso({
      slug,
      titulo,
      zona: zona as ZonaSlug,
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
