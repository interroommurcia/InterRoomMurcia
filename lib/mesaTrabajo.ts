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

export type TrabajadorRef = { id: string; nombre: string };

export type TareaConCliente = Tarea & {
  clienteNombre: string | null;
  asignados: TrabajadorRef[];
};

type TareaRow = Tarea & {
  clientes: { nombre: string; apellidos: string | null } | null;
  mesa_trabajo_asignados: { trabajadores: { id: string; nombre: string } | null }[] | null;
};

function mapRow(r: TareaRow): TareaConCliente {
  return {
    ...r,
    clienteNombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellidos ?? ""}`.trim() : null,
    asignados: (r.mesa_trabajo_asignados ?? [])
      .map((a) => a.trabajadores)
      .filter((t): t is TrabajadorRef => !!t),
  };
}

const SELECT = "*, clientes(nombre, apellidos), mesa_trabajo_asignados(trabajadores(id, nombre))";

async function reemplazarAsignados(tareaId: string, ids: string[]) {
  const admin = getSupabaseAdmin();
  await admin.from("mesa_trabajo_asignados").delete().eq("tarea_id", tareaId);
  const unicos = Array.from(new Set(ids.filter(Boolean)));
  if (!unicos.length) return;
  const { error } = await admin
    .from("mesa_trabajo_asignados")
    .insert(unicos.map((trabajador_id) => ({ tarea_id: tareaId, trabajador_id })));
  if (error) throw error;
}

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
  let ids: string[] | null = null;
  if (asignado_a) {
    const { data: rel, error: relErr } = await admin
      .from("mesa_trabajo_asignados")
      .select("tarea_id")
      .eq("trabajador_id", asignado_a);
    if (relErr) throw relErr;
    ids = (rel ?? []).map((r: { tarea_id: string }) => r.tarea_id);
    if (!ids.length) return [];
  }
  let q = admin.from("mesa_trabajo").select(SELECT).gte("fecha", desde).lte("fecha", hasta);
  if (ids) q = q.in("id", ids);
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
  asignados_ids?: string[];
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
  const tarea = data as Tarea;
  if (input.asignados_ids?.length) {
    await reemplazarAsignados(tarea.id, input.asignados_ids);
  }
  return tarea;
}

export async function actualizarTarea(
  id: string,
  patch: Partial<{ estado: EstadoTarea; asignados_ids: string[]; notas: string | null }>
) {
  const admin = getSupabaseAdmin();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.estado) dbPatch.estado = patch.estado;
  if (patch.notas !== undefined) dbPatch.notas = patch.notas;
  const { error } = await admin.from("mesa_trabajo").update(dbPatch).eq("id", id);
  if (error) throw error;
  if (patch.asignados_ids !== undefined) {
    await reemplazarAsignados(id, patch.asignados_ids);
  }
}

export async function actualizarEstadoTarea(id: string, estado: EstadoTarea) {
  return actualizarTarea(id, { estado });
}

export async function eliminarTarea(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("mesa_trabajo").delete().eq("id", id);
  if (error) throw error;
}
