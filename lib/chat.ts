import { getSupabaseAdmin } from "./supabaseAdmin";

export type ChatMensaje = { role: "user" | "assistant"; text: string; at: string };
export type ChatEstado = "abierta" | "escalada" | "cerrada";

export type ChatConversacion = {
  id: string;
  estado: ChatEstado;
  motivo_escalado: string | null;
  nombre: string | null;
  contacto: string | null;
  pagina_origen: string | null;
  mensajes: ChatMensaje[];
  leido: boolean;
  created_at: string;
  updated_at: string;
};

export async function crearConversacion(paginaOrigen: string | null): Promise<ChatConversacion> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("chat_conversaciones")
    .insert({ pagina_origen: paginaOrigen, mensajes: [] })
    .select()
    .single();
  if (error) throw error;
  return data as ChatConversacion;
}

export async function getConversacion(id: string): Promise<ChatConversacion | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("chat_conversaciones").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ChatConversacion | null;
}

export async function guardarMensajes(
  id: string,
  mensajes: ChatMensaje[],
  clasificacion?: { escalar: boolean; motivo: string | null; nombre: string | null; contacto: string | null }
) {
  const admin = getSupabaseAdmin();
  const update: Record<string, unknown> = { mensajes, updated_at: new Date().toISOString() };
  if (clasificacion?.escalar) {
    update.estado = "escalada";
    update.motivo_escalado = clasificacion.motivo;
    if (clasificacion.nombre) update.nombre = clasificacion.nombre;
    if (clasificacion.contacto) update.contacto = clasificacion.contacto;
  }
  const { error } = await admin.from("chat_conversaciones").update(update).eq("id", id);
  if (error) throw error;
}

export async function listarConversaciones(): Promise<ChatConversacion[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("chat_conversaciones")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ChatConversacion[];
}

export async function marcarLeido(id: string, leido: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("chat_conversaciones").update({ leido }).eq("id", id);
  if (error) throw error;
}

export const KNOWLEDGE_BASE_MAX_CHARS = 20000;

export async function getKnowledgeBase(): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("chat_config").select("knowledge_base").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data?.knowledge_base ?? "";
}

export async function setKnowledgeBase(text: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("chat_config")
    .upsert({ id: 1, knowledge_base: text, updated_at: new Date().toISOString() });
  if (error) throw error;
}
