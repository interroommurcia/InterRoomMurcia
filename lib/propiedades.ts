import { getSupabaseAdmin } from "./supabaseAdmin";

export type Propiedad = {
  id: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  num_habitaciones: number;
  num_banos: number;
  precio_total: number | null;
  notas: string | null;
  servicio_wifi: boolean;
  servicio_limpieza: boolean;
  servicio_luz: boolean;
  servicio_agua: boolean;
  tiene_garaje: boolean;
  precio_garaje: number | null;
  created_at: string;
  updated_at: string;
};

export type PropiedadHabitacion = {
  id: string;
  propiedad_id: string;
  nombre: string;
  precio: number | null;
  cliente_id: string | null;
  orden: number;
  created_at: string;
};

export type PropiedadMedia = {
  id: string;
  propiedad_id: string;
  habitacion_id: string | null;
  tipo: "foto" | "video";
  url: string;
  storage_path: string | null;
  orden: number;
  created_at: string;
};

export type PropiedadConDetalle = Propiedad & {
  habitaciones: (PropiedadHabitacion & { clienteNombre: string | null })[];
  media: PropiedadMedia[];
};

const BUCKET = "propiedades";

export async function listarPropiedades(): Promise<PropiedadConDetalle[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("propiedades")
    .select("*, propiedad_habitaciones(*, clientes(nombre, apellidos)), propiedad_media(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  type Row = Propiedad & {
    propiedad_habitaciones: (PropiedadHabitacion & { clientes: { nombre: string; apellidos: string | null } | null })[] | null;
    propiedad_media: PropiedadMedia[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    habitaciones: (r.propiedad_habitaciones ?? [])
      .sort((a, b) => a.orden - b.orden)
      .map((h) => ({
        ...h,
        clienteNombre: h.clientes ? `${h.clientes.nombre} ${h.clientes.apellidos ?? ""}`.trim() : null,
      })),
    media: (r.propiedad_media ?? []).sort((a, b) => a.orden - b.orden),
  }));
}

export async function crearPropiedad(input: {
  tipo?: string;
  nombre: string;
  direccion?: string;
  num_habitaciones?: number;
  num_banos?: number;
  precio_total?: number | null;
  notas?: string;
}): Promise<Propiedad> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("propiedades")
    .insert({
      tipo: input.tipo || "piso",
      nombre: input.nombre,
      direccion: input.direccion || null,
      num_habitaciones: input.num_habitaciones ?? 0,
      num_banos: input.num_banos ?? 0,
      precio_total: input.precio_total ?? null,
      notas: input.notas || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Propiedad;
}

export async function actualizarPropiedad(
  id: string,
  patch: Partial<Omit<Propiedad, "id" | "created_at" | "updated_at">>
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("propiedades")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarPropiedad(id: string) {
  const admin = getSupabaseAdmin();
  const prop = await admin.from("propiedad_media").select("storage_path").eq("propiedad_id", id);
  const paths = (prop.data ?? [])
    .map((m: { storage_path: string | null }) => m.storage_path)
    .filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(BUCKET).remove(paths);
  const { error } = await admin.from("propiedades").delete().eq("id", id);
  if (error) throw error;
}

export async function crearHabitacion(propiedad_id: string, input: { nombre: string; precio?: number | null; cliente_id?: string | null; orden?: number }) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("propiedad_habitaciones")
    .insert({
      propiedad_id,
      nombre: input.nombre,
      precio: input.precio ?? null,
      cliente_id: input.cliente_id ?? null,
      orden: input.orden ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PropiedadHabitacion;
}

export async function actualizarHabitacion(id: string, patch: Partial<Pick<PropiedadHabitacion, "nombre" | "precio" | "cliente_id" | "orden">>) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("propiedad_habitaciones").update(patch).eq("id", id);
  if (error) throw error;
}

export async function eliminarHabitacion(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("propiedad_habitaciones").delete().eq("id", id);
  if (error) throw error;
}

export async function subirMedia(
  propiedad_id: string,
  archivo: { nombre: string; buffer: Buffer; contentType: string },
  tipo: "foto" | "video",
  habitacion_id?: string | null
) {
  const admin = getSupabaseAdmin();
  const ext = archivo.nombre.split(".").pop() || (tipo === "video" ? "mp4" : "jpg");
  const path = `${propiedad_id}/${habitacion_id ?? "general"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, archivo.buffer, {
    contentType: archivo.contentType,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const { data, error } = await admin
    .from("propiedad_media")
    .insert({ propiedad_id, habitacion_id: habitacion_id ?? null, tipo, url: pub.publicUrl, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data as PropiedadMedia;
}

export async function descargarMedia(id: string): Promise<{ nombre: string; buffer: Buffer; contentType: string } | null> {
  const admin = getSupabaseAdmin();
  const { data: reg } = await admin.from("propiedad_media").select("storage_path, tipo").eq("id", id).maybeSingle();
  if (!reg?.storage_path) return null;
  const { data, error } = await admin.storage.from(BUCKET).download(reg.storage_path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  const nombre = reg.storage_path.split("/").pop() || "archivo";
  return { nombre, buffer, contentType: data.type || "application/octet-stream" };
}

export async function copiarMediaAPiso(mediaId: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data: reg } = await admin.from("propiedad_media").select("storage_path, tipo").eq("id", mediaId).maybeSingle();
  if (!reg?.storage_path || reg.tipo !== "foto") return null;
  const { data: blob } = await admin.storage.from(BUCKET).download(reg.storage_path);
  if (!blob) return null;
  const ext = reg.storage_path.split(".").pop() || "jpg";
  const destino = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from("pisos").upload(destino, blob, { contentType: blob.type, upsert: false });
  if (error) return null;
  return admin.storage.from("pisos").getPublicUrl(destino).data.publicUrl;
}

export async function eliminarMedia(id: string) {
  const admin = getSupabaseAdmin();
  const { data: reg } = await admin.from("propiedad_media").select("storage_path").eq("id", id).maybeSingle();
  if (reg?.storage_path) await admin.storage.from(BUCKET).remove([reg.storage_path]);
  const { error } = await admin.from("propiedad_media").delete().eq("id", id);
  if (error) throw error;
}
