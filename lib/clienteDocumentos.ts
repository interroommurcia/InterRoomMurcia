import { getSupabaseAdmin } from "./supabaseAdmin";

const BUCKET = "documentos";

export type CategoriaDocumento = "factura" | "seguro" | "dni" | "contrato" | "nomina" | "otro";

export const CATEGORIAS_DOCUMENTO: { value: CategoriaDocumento; label: string }[] = [
  { value: "factura", label: "Factura" },
  { value: "seguro", label: "Seguro" },
  { value: "dni", label: "DNI / NIE" },
  { value: "contrato", label: "Contrato" },
  { value: "nomina", label: "Nómina / Solvencia" },
  { value: "otro", label: "Otro" },
];

export type ClienteDocumento = {
  id: string;
  cliente_id: string;
  nombre: string;
  categoria: CategoriaDocumento;
  storage_path: string;
  content_type: string | null;
  solo_contabilidad: boolean;
  created_at: string;
};

function sanitizeFilename(name: string): string {
  return name.normalize("NFD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 120);
}

export async function listarClienteDocumentos(
  clienteId: string,
  opts?: { ocultarSoloContabilidad?: boolean },
): Promise<ClienteDocumento[]> {
  const admin = getSupabaseAdmin();
  let q = admin
    .from("cliente_documentos")
    .select("*")
    .eq("cliente_id", clienteId);
  // Vista de Clientes (comercial/gestora): ocultar los marcados como "solo Contabilidad".
  if (opts?.ocultarSoloContabilidad) q = q.eq("solo_contabilidad", false);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClienteDocumento[];
}

export async function actualizarVisibilidadDocumento(id: string, soloContabilidad: boolean): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("cliente_documentos")
    .update({ solo_contabilidad: soloContabilidad })
    .eq("id", id);
  if (error) throw error;
}

export async function subirClienteDocumento(
  clienteId: string,
  nombre: string,
  categoria: CategoriaDocumento,
  buffer: Buffer,
  contentType: string,
): Promise<ClienteDocumento> {
  const admin = getSupabaseAdmin();
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const path = `clientes/${clienteId}/${Date.now()}-${sanitizeFilename(nombre)}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType });
  if (uploadError) throw uploadError;

  const { data, error } = await admin
    .from("cliente_documentos")
    .insert({ cliente_id: clienteId, nombre, categoria, storage_path: path, content_type: contentType })
    .select()
    .single();
  if (error) throw error;
  return data as ClienteDocumento;
}

export async function descargarClienteDocumento(
  id: string,
): Promise<{ nombre: string; buffer: Buffer; contentType: string } | null> {
  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("cliente_documentos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!doc) return null;
  const { data: file, error: dErr } = await admin.storage.from(BUCKET).download(doc.storage_path);
  if (dErr) throw dErr;
  const buffer = Buffer.from(await file.arrayBuffer());
  return { nombre: doc.nombre, buffer, contentType: doc.content_type || "application/octet-stream" };
}

export async function eliminarClienteDocumento(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: doc, error: gErr } = await admin.from("cliente_documentos").select("*").eq("id", id).maybeSingle();
  if (gErr) throw gErr;
  if (doc?.storage_path) {
    await admin.storage.from(BUCKET).remove([doc.storage_path]).catch(() => {});
  }
  const { error } = await admin.from("cliente_documentos").delete().eq("id", id);
  if (error) throw error;
}
