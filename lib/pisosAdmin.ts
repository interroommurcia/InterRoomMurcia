import { getSupabaseAdmin } from "./supabaseAdmin";
import type { Zona } from "./pisos";

const BUCKET = "pisos";

export type PisoInput = {
  slug: string;
  titulo: string;
  zona: Zona["slug"];
  barrio: string;
  precioMes: number;
  metros: number | null;
  descripcion: string;
  disponible: boolean;
  imageUrl: string | null;
};

function toRow(input: Partial<PisoInput>) {
  const row: Record<string, unknown> = {};
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.titulo !== undefined) row.titulo = input.titulo;
  if (input.zona !== undefined) row.zona = input.zona;
  if (input.barrio !== undefined) row.barrio = input.barrio;
  if (input.precioMes !== undefined) row.precio_mes = input.precioMes;
  if (input.metros !== undefined) row.metros = input.metros;
  if (input.descripcion !== undefined) row.descripcion = input.descripcion;
  if (input.disponible !== undefined) row.disponible = input.disponible;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
  return row;
}

export async function crearPiso(input: PisoInput) {
  const { error } = await getSupabaseAdmin().from("pisos").insert(toRow(input));
  if (error) throw error;
}

export async function actualizarPiso(id: string, input: Partial<PisoInput>) {
  const { error } = await getSupabaseAdmin().from("pisos").update(toRow(input)).eq("id", id);
  if (error) throw error;
}

export async function borrarPiso(id: string) {
  const { error } = await getSupabaseAdmin().from("pisos").delete().eq("id", id);
  if (error) throw error;
}

export async function subirImagenPiso(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
