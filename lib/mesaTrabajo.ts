import { getSupabaseAdmin } from "./supabaseAdmin";

export type TipoTarea = "tarea" | "cita" | "visita";
export type EstadoTarea = "pendiente" | "hecha";

export type Tarea = {
  id: string;
  tipo: TipoTarea;
  titulo: string;
  fecha: string | null;
  hora: string | null;
  cliente_id: string | null;
  estado: EstadoTarea;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type TareaConCliente = Tarea & { clienteNombre: string | null };

export async function listarTareas(): Promise<TareaConCliente[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("mesa_trabajo")
    .select("*, clientes(nombre, apellidos)")
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (Tarea & { clientes: { nombre: string; apellidos: string | null } | null })[]).map((r) => ({
    ...r,
    clienteNombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellidos ?? ""}`.trim() : null,
  }));
}

export async function listarTareasEntreFechas(desde: string, hasta: string): Promise<TareaConCliente[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("mesa_trabajo")
    .select("*, clientes(nombre, apellidos)")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (Tarea & { clientes: { nombre: string; apellidos: string | null } | null })[]).map((r) => ({
    ...r,
    clienteNombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellidos ?? ""}`.trim() : null,
  }));
}

export async function crearTarea(input: {
  tipo: TipoTarea;
  titulo: string;
  fecha?: string;
  hora?: string;
  cliente_id?: string;
  notas?: string;
}): Promise<Tarea> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("mesa_trabajo")
    .insert({
      tipo: input.tipo,
      titulo: input.titulo,
      fecha: input.fecha || null,
      hora: input.hora || null,
      cliente_id: input.cliente_id || null,
      notas: input.notas || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Tarea;
}

export async function actualizarEstadoTarea(id: string, estado: EstadoTarea) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("mesa_trabajo")
    .update({ estado, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarTarea(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("mesa_trabajo").delete().eq("id", id);
  if (error) throw error;
}
