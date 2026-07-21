import { NextRequest, NextResponse } from "next/server";
import { actualizarPiso, borrarPiso, subirImagenPiso, type PisoInput } from "../../../../../lib/pisosAdmin";
import type { Zona } from "../../../../../lib/pisos";

const ZONAS_VALIDAS = ["ucam", "umu", "upct"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const updates: Partial<PisoInput> = {};

  const titulo = form.get("titulo");
  if (typeof titulo === "string" && titulo.trim()) updates.titulo = titulo.trim().slice(0, 150);

  const zona = form.get("zona");
  if (typeof zona === "string" && ZONAS_VALIDAS.includes(zona)) updates.zona = zona as Zona["slug"];

  const barrio = form.get("barrio");
  if (typeof barrio === "string" && barrio.trim()) updates.barrio = barrio.trim().slice(0, 120);

  const precioMes = form.get("precioMes");
  if (precioMes && Number(precioMes) > 0) updates.precioMes = Number(precioMes);

  const metros = form.get("metros");
  if (metros !== null) updates.metros = metros === "" ? null : Number(metros);

  const descripcion = form.get("descripcion");
  if (typeof descripcion === "string" && descripcion.trim()) updates.descripcion = descripcion.trim().slice(0, 2000);

  if (form.get("disponible") !== null) updates.disponible = form.get("disponible") === "true";

  try {
    const imagen = form.get("imagen");
    if (imagen instanceof File && imagen.size > 0) {
      updates.imageUrl = await subirImagenPiso(imagen);
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
    await borrarPiso(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error borrando piso", err);
    return NextResponse.json({ error: "No se pudo borrar el piso" }, { status: 500 });
  }
}
