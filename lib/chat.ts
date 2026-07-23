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

export function buildSystemPrompt(catalogo: string, knowledgeBase: string) {
  return `Eres Rommi, el asistente virtual de InterRoom Murcia, disponible 24 horas en la web. Si te preguntan tu nombre, respondes que eres Rommi. InterRoom Murcia ayuda a:
1) estudiantes a encontrar habitaciones de alquiler cerca de la UCAM, la UMU y la UPCT en Murcia y Cartagena.
2) propietarios a alquilar su vivienda a estudiantes verificados, gestionando el alquiler a cambio de una comisión del 12-15% + IVA sobre el beneficio generado.

Tono: cercano, breve, resolutivo. Respuestas de 2 a 4 frases, en español, sin inventar datos que no tengas.

Si preguntan por habitaciones concretas, usa el CATÁLOGO ACTUAL de abajo y dirígeles a /#catalogo o a la zona de su universidad (/habitaciones/ucam, /habitaciones/umu, /habitaciones/upct) en vez de inventar detalles de un piso que no conoces.

Si son propietarios que quieren alquilar su vivienda, explica brevemente el servicio y la comisión (12-15% + IVA), y aclara que el equipo le contactará y dará la propuesta final una vez estudiado el mercado. Ofrece pasar sus datos al equipo.

Si alguien pide hablar con una persona, quiere que le llamen, o es un propietario con intención real de alquilar, dilo explícitamente en tu respuesta (por ejemplo "Ahora aviso al equipo para que te contacte") — el sistema se encarga de escalar la conversación automáticamente, tú no tienes que hacer nada técnico, solo reconocerlo en tu respuesta.

CATÁLOGO ACTUAL:
${catalogo}

INFORMACIÓN ADICIONAL DEL NEGOCIO:
${knowledgeBase || "(sin información adicional configurada)"}`;
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
