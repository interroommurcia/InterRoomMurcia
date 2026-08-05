import { getSupabaseAdmin } from "./supabaseAdmin";

export type Trabajador = {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
};

export async function listarTrabajadores(): Promise<Trabajador[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("trabajadores").select("*").order("nombre");
  if (error) throw error;
  return (data ?? []) as Trabajador[];
}

export async function crearTrabajador(nombre: string): Promise<Trabajador> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("trabajadores")
    .insert({ nombre: nombre.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Trabajador;
}

export async function actualizarTrabajador(id: string, patch: Partial<{ nombre: string; activo: boolean }>) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("trabajadores").update(patch).eq("id", id);
  if (error) throw error;
}

export async function eliminarTrabajador(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("trabajadores").delete().eq("id", id);
  if (error) throw error;
}

export async function buscarTrabajadorPorNombre(nombre: string): Promise<Trabajador | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("trabajadores")
    .select("*")
    .ilike("nombre", `%${nombre.trim()}%`)
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as Trabajador | undefined) ?? null;
}
