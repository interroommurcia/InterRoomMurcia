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
  asignado_a: string | null;
  estado: EstadoTarea;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type TareaConCliente = Tarea & { clienteNombre: string | null; trabajadorNombre: string | null };

type TareaRow = Tarea & {
  clientes: { nombre: string; apellidos: string | null } | null;
  trabajadores: { nombre: string } | null;
};

function mapRow(r: TareaRow): TareaConCliente {
  return {
    ...r,
    clienteNombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellidos ?? ""}`.trim() : null,
    trabajadorNombre: r.trabajadores?.nombre ?? null,
  };
}

const SELECT = "*, clientes(nombre, apellidos), trabajadores(nombre)";

export async function listarTareas(): Promise<TareaConCliente[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("mesa_trabajo")
    .select(SELECT)
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TareaRow[]).map(mapRow);
}

export async function listarTareasEntreFechas(desde: string, hasta: string, asignado_a?: string): Promise<TareaConCliente[]> {
  const admin = getSupabaseAdmin();
  let q = admin
    .from("mesa_trabajo")
    .select(SELECT)
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (asignado_a) q = q.eq("asignado_a", asignado_a);
  const { data, error } = await q
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TareaRow[]).map(mapRow);
}

export async function crearTarea(input: {
  tipo: TipoTarea;
  titulo: string;
  fecha?: string;
  hora?: string;
  cliente_id?: string;
  asignado_a?: string;
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
      asignado_a: input.asignado_a || null,
      notas: input.notas || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Tarea;
}

export async function actualizarTarea(id: string, patch: Partial<{ estado: EstadoTarea; asignado_a: string | null }>) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("mesa_trabajo")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function actualizarEstadoTarea(id: string, estado: EstadoTarea) {
  return actualizarTarea(id, { estado });
}

export async function eliminarTarea(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("mesa_trabajo").delete().eq("id", id);
  if (error) throw error;
}
