import { getSupabaseAdmin } from "./supabaseAdmin";
import { telegramSendMessage } from "./telegram";

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

FORMATO OBLIGATORIO: escribe siempre en texto plano. Nunca uses markdown: nada de asteriscos para negritas ni cursivas, nada de enlaces con corchetes/paréntesis, nada de almohadillas de título, nada de guiones para listas. Escribe las palabras normales, sin ningún símbolo decorativo. No pegues URLs ni rutas del sitio (nada de /#catalogo, /habitaciones/umu, etc.) — recomienda de palabra que se pase por la sección de catálogo de la web.

Si preguntan por habitaciones concretas, apóyate en el CATÁLOGO ACTUAL de abajo para dar datos reales, recomiéndales echar un vistazo al catálogo de la web, y pídeles su teléfono o correo para que el equipo les llame o escriba con los detalles y para concertar visita. No inventes pisos que no estén en el catálogo.

Si son propietarios que quieren alquilar su vivienda, explica brevemente el servicio y la comisión (12-15% + IVA), aclara que el equipo dará la propuesta final tras estudiar el mercado, y con especial prioridad pídeles su teléfono y/o correo para que el equipo les contacte cuanto antes.

Siempre que percibas interés real (una persona buscando piso o un propietario que quiere alquilar), pide su teléfono o email antes de cerrar la conversación. Si aceptan que les contacten, o piden hablar con una persona, dilo explícitamente ("aviso al equipo para que te contacte") — el sistema escala la conversación automáticamente.

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

export async function avisarEscaladoRommi(conv: {
  id: string;
  nombre: string | null;
  contacto: string | null;
  motivo_escalado: string | null;
  pagina_origen: string | null;
  mensajes: ChatMensaje[];
}) {
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!chatIds.length) return;

  const ultimos = conv.mensajes.slice(-4)
    .map((m) => `${m.role === "user" ? "👤" : "🤖"} ${m.text.slice(0, 200)}`)
    .join("\n");

  const texto = [
    "🔔 Nuevo lead escalado en Rommi",
    `Nombre: ${conv.nombre ?? "—"}`,
    `Contacto: ${conv.contacto ?? "—"}`,
    `Motivo: ${conv.motivo_escalado ?? "—"}`,
    `Página: ${conv.pagina_origen ?? "—"}`,
    "",
    "Últimos mensajes:",
    ultimos,
    "",
    `Ver: /admin/chats#${conv.id}`,
  ].join("\n");

  await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch((e) => console.error("[rommi/notify]", id, e))));
}
