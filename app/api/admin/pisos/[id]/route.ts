import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { actualizarPiso, borrarPiso, subirImagenPiso, type PisoInput } from "../../../../../lib/pisosAdmin";
import type { ZonaSlug } from "../../../../../lib/pisos";

const ZONAS_ALQUILER = ["ucam", "umu", "upct"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const updates: Partial<PisoInput> = {};

  const titulo = form.get("titulo");
  if (typeof titulo === "string" && titulo.trim()) updates.titulo = titulo.trim().slice(0, 150);

  const zona = form.get("zona");
  if (typeof zona === "string" && zona.length > 0 && zona.length <= 40) updates.zona = zona as ZonaSlug;

  const barrio = form.get("barrio");
  if (typeof barrio === "string" && barrio.trim()) updates.barrio = barrio.trim().slice(0, 120);

  const precioMes = form.get("precioMes");
  if (precioMes && Number(precioMes) > 0) updates.precioMes = Number(precioMes);

  const metros = form.get("metros");
  if (metros !== null) updates.metros = metros === "" ? null : Number(metros);

  const descripcion = form.get("descripcion");
  if (typeof descripcion === "string" && descripcion.trim()) updates.descripcion = descripcion.trim().slice(0, 2000);

  if (form.get("disponible") !== null) updates.disponible = form.get("disponible") === "true";

  const categoriaVal = form.get("categoria");
  if (typeof categoriaVal === "string" && (categoriaVal === "alquiler" || categoriaVal === "compraventa")) updates.categoria = categoriaVal;

  try {
    const imagen = form.get("imagen");
    if (imagen instanceof File && imagen.size > 0) {
      updates.imageUrl = await subirImagenPiso(imagen);
    }

    const galeriaFiles = form.getAll("galeria");
    if (galeriaFiles.some((f) => f instanceof File && f.size > 0)) {
      const existingRaw = form.get("galeria_existente");
      const existing: string[] = existingRaw ? JSON.parse(String(existingRaw)) : [];
      const gallery = [...existing];
      for (const entry of galeriaFiles) {
        if (entry instanceof File && entry.size > 0) {
          gallery.push(await subirImagenPiso(entry));
        }
      }
      updates.gallery = gallery;
    }

    const video = form.get("video");
    if (video instanceof File && video.size > 0) {
      updates.videoUrl = await subirImagenPiso(video);
    }

    const borrarVideo = form.get("borrar_video");
    if (borrarVideo === "true") {
      updates.videoUrl = null;
    }

    await actualizarPiso(params.id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error actualizando piso", err);
    return NextResponse.json({ error: "No se pudo actualizar el piso" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const affected = await borrarPiso(params.id);
    if (affected === 0) {
      return NextResponse.json(
        { error: "El servidor devolvió 0 filas borradas. Revisa RLS o el SUPABASE_SERVICE_ROLE_KEY en Vercel — probablemente el service role no está aplicándose." },
        { status: 500 }
      );
    }
    revalidatePath("/admin/pisos");
    revalidatePath("/");
    return NextResponse.json({ ok: true, affected });
  } catch (err) {
    console.error("Error borrando piso", err);
    const message = err instanceof Error ? err.message : "No se pudo borrar el piso";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
