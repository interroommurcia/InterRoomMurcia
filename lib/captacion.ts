import { getSupabaseAdmin } from "./supabaseAdmin";

export type EstadoCasa = "contactado" | "seguimiento" | "captado" | "descartado";
export const ESTADOS_CASA: EstadoCasa[] = ["contactado", "seguimiento", "captado", "descartado"];

export type PisoVinculado = {
  id: string;
  slug: string;
  titulo: string;
  zona: string;
  barrio: string;
  categoria: string;
  image_url: string | null;
};

export type CasaCaptacion = {
  id: string;
  nombre: string;
  telefono: string;
  zona: string;
  direccion: string;
  descripcion: string;
  estado: EstadoCasa;
  piso_id: string | null;
  piso: PisoVinculado | null;
  created_at: string;
  updated_at: string;
};

const CAMPOS_TEXTO = ["nombre", "telefono", "zona", "direccion", "descripcion"] as const;
type CampoTexto = (typeof CAMPOS_TEXTO)[number];

const SELECT = "*, piso:pisos(id, slug, titulo, zona, barrio, categoria, image_url)";

type CasaRow = Omit<CasaCaptacion, "piso"> & { piso: PisoVinculado | PisoVinculado[] | null };

function mapRow(r: CasaRow): CasaCaptacion {
  const piso = Array.isArray(r.piso) ? r.piso[0] ?? null : r.piso;
  return { ...r, piso };
}

export async function listarCasas(): Promise<CasaCaptacion[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("captacion_casas")
    .select(SELECT)
    // Orden por antigüedad: el primer contacto añadido es el nº1 y se queda
    // fijo; las líneas nuevas se añaden al final (coincide con el append del
    // cliente). Antes era descendente y descolocaba la numeración al recargar.
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as CasaRow[]).map(mapRow);
}

export async function obtenerCasa(id: string): Promise<CasaCaptacion | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("captacion_casas").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as CasaRow) : null;
}

export async function crearCasa(): Promise<CasaCaptacion> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("captacion_casas").insert({}).select(SELECT).single();
  if (error) throw error;
  return mapRow(data as unknown as CasaRow);
}

export async function actualizarCasa(
  id: string,
  patch: Partial<Record<CampoTexto, string> & { estado: EstadoCasa; piso_id: string | null }>
): Promise<void> {
  const admin = getSupabaseAdmin();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const campo of CAMPOS_TEXTO) {
    if (typeof patch[campo] === "string") dbPatch[campo] = patch[campo];
  }
  if (patch.estado && ESTADOS_CASA.includes(patch.estado)) dbPatch.estado = patch.estado;
  if ("piso_id" in patch) dbPatch.piso_id = patch.piso_id || null;
  const { error } = await admin.from("captacion_casas").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function eliminarCasa(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("captacion_casas").delete().eq("id", id);
  if (error) throw error;
}
