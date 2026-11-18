import { getSupabaseAdmin } from "./supabaseAdmin";

export type EstadoCasa = "contactado" | "seguimiento" | "captado" | "descartado";
export const ESTADOS_CASA: EstadoCasa[] = ["contactado", "seguimiento", "captado", "descartado"];

export type CasaCaptacion = {
  id: string;
  nombre: string;
  telefono: string;
  zona: string;
  direccion: string;
  descripcion: string;
  estado: EstadoCasa;
  created_at: string;
  updated_at: string;
};

const CAMPOS_TEXTO = ["nombre", "telefono", "zona", "direccion", "descripcion"] as const;
type CampoTexto = (typeof CAMPOS_TEXTO)[number];

export async function listarCasas(): Promise<CasaCaptacion[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("captacion_casas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CasaCaptacion[];
}

export async function crearCasa(): Promise<CasaCaptacion> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("captacion_casas").insert({}).select().single();
  if (error) throw error;
  return data as CasaCaptacion;
}

export async function actualizarCasa(
  id: string,
  patch: Partial<Record<CampoTexto, string> & { estado: EstadoCasa }>
): Promise<void> {
  const admin = getSupabaseAdmin();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const campo of CAMPOS_TEXTO) {
    if (typeof patch[campo] === "string") dbPatch[campo] = patch[campo];
  }
  if (patch.estado && ESTADOS_CASA.includes(patch.estado)) dbPatch.estado = patch.estado;
  const { error } = await admin.from("captacion_casas").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function eliminarCasa(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("captacion_casas").delete().eq("id", id);
  if (error) throw error;
}
