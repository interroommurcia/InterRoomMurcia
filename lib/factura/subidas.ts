import { getSupabaseAdmin } from "../supabaseAdmin";
import type { FacturaSubida } from "./tipos";

const BUCKET = "facturas";

function sanitize(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

function mesDe(fecha: string): string {
  const d = new Date(fecha);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rowToSubida(r: Record<string, unknown>): FacturaSubida {
  return {
    id: String(r.id),
    fecha: String(r.fecha),
    concepto: String(r.concepto),
    importe: r.importe != null ? Number(r.importe) : null,
    notas: (r.notas as string | null) ?? null,
    nombre_archivo: String(r.nombre_archivo),
    storage_path: String(r.storage_path),
    created_at: String(r.created_at),
  };
}

export async function listarSubidas(anio?: number): Promise<FacturaSubida[]> {
  const admin = getSupabaseAdmin();
  let q = admin.from("facturas_subidas").select("*").order("fecha", { ascending: false });
  if (anio) q = q.gte("fecha", `${anio}-01-01`).lte("fecha", `${anio}-12-31`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToSubida);
}

export async function crearSubida(input: {
  fecha: string;
  concepto: string;
  importe?: number | null;
  notas?: string | null;
  nombreArchivo: string;
  contentType: string;
  buffer: Buffer;
}): Promise<FacturaSubida> {
  const admin = getSupabaseAdmin();
  const path = `subidas/${mesDe(input.fecha)}/${Date.now()}_${sanitize(input.nombreArchivo)}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, input.buffer, {
    contentType: input.contentType || "application/octet-stream",
    upsert: true,
  });
  if (upErr) throw upErr;

  const { data, error } = await admin
    .from("facturas_subidas")
    .insert({
      fecha: input.fecha,
      concepto: input.concepto,
      importe: input.importe ?? null,
      notas: input.notas ?? null,
      nombre_archivo: input.nombreArchivo,
      storage_path: path,
    })
    .select()
    .single();
  if (error) {
    await admin.storage.from(BUCKET).remove([path]).catch(() => {});
    throw error;
  }
  return rowToSubida(data);
}

export async function descargarSubida(id: string): Promise<{ nombre: string; contentType: string; buffer: Buffer } | null> {
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin.from("facturas_subidas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const sub = rowToSubida(row);
  const { data } = await admin.storage.from(BUCKET).download(sub.storage_path);
  if (!data) return null;
  const ext = sub.nombre_archivo.toLowerCase();
  const contentType = ext.endsWith(".pdf") ? "application/pdf"
    : ext.endsWith(".png") ? "image/png"
    : ext.endsWith(".jpg") || ext.endsWith(".jpeg") ? "image/jpeg"
    : "application/octet-stream";
  return { nombre: sub.nombre_archivo, contentType, buffer: Buffer.from(await data.arrayBuffer()) };
}

export async function eliminarSubida(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: row } = await admin.from("facturas_subidas").select("storage_path").eq("id", id).maybeSingle();
  const path = row?.storage_path as string | undefined;
  if (path) await admin.storage.from(BUCKET).remove([path]).catch(() => {});
  const { error } = await admin.from("facturas_subidas").delete().eq("id", id);
  if (error) throw error;
}
