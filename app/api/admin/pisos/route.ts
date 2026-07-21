import { NextRequest, NextResponse } from "next/server";
import { crearPiso, subirImagenPiso } from "../../../../lib/pisosAdmin";
import type { Zona } from "../../../../lib/pisos";

const ZONAS_VALIDAS = ["ucam", "umu", "upct"];

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const slug = String(form.get("slug") || "").trim().slice(0, 80);
  const titulo = String(form.get("titulo") || "").trim().slice(0, 150);
  const zona = String(form.get("zona") || "");
  const barrio = String(form.get("barrio") || "").trim().slice(0, 120);
  const precioMes = Number(form.get("precioMes"));
  const metrosRaw = form.get("metros");
  const metros = metrosRaw && metrosRaw !== "" ? Number(metrosRaw) : null;
  const descripcion = String(form.get("descripcion") || "").trim().slice(0, 2000);
  const disponible = form.get("disponible") === "true";
  const imagen = form.get("imagen");

  if (!slug || !titulo || !ZONAS_VALIDAS.includes(zona) || !barrio || !precioMes || !descripcion) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  try {
    let imageUrl: string | null = null;
    if (imagen instanceof File && imagen.size > 0) {
      imageUrl = await subirImagenPiso(imagen);
    }
    await crearPiso({
      slug,
      titulo,
      zona: zona as Zona["slug"],
      barrio,
      precioMes,
      metros,
      descripcion,
      disponible,
      imageUrl,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error creando piso", err);
    return NextResponse.json({ error: "No se pudo guardar el piso" }, { status: 500 });
  }
}
