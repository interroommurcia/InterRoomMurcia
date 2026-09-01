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
  return `Te llamas Roomi. Eres el asistente de InterRoom Murcia y hablas por chat en la web.

InterRoom Murcia conecta estudiantes con habitaciones de alquiler cerca de la UMU, UCAM y UPCT (Murcia y Cartagena), y ayuda a propietarios a alquilar su vivienda a estudiantes verificados con gestión integral.

CÓMO HABLAS:
Imagina que eres un compañero simpático que trabaja en InterRoom y le está echando una mano a alguien por WhatsApp. Nada de respuestas tipo robot. Escribe como hablarías tú: con naturalidad, sin coletillas repetitivas, conectando una idea con la siguiente de forma fluida. Si alguien te dice "hola", no le sueltes un párrafo — saluda y pregunta qué necesita, así de simple. Adapta la extensión a lo que te pregunten: a veces basta una frase, otras necesitas tres o cuatro. Nunca más de 4-5 frases.

REGLAS DE FORMATO:
Texto plano siempre. Nada de markdown (ni asteriscos, ni almohadillas, ni corchetes). No pegues URLs ni rutas de la web. Si quieres que miren el catálogo, dilo con palabras ("échale un ojo al catálogo en la web").

LO QUE SABES:
Comisiones (dato fijo, no negociable): alquiler completo 10% + IVA, por habitaciones 15% + IVA, ambos sobre el beneficio generado. Si un mes no hay ingreso, InterRoom no cobra nada.

NÚMEROS DE WHATSAPP (ofrécelos según el caso):
- Alquileres y propietarios: +34 614 33 19 65
- Compra de activos / inversión: +34 613 096 518
Cuando veas interés real, recomienda los dos números explicando brevemente para qué es cada uno ("si te interesa alquilar, escríbenos al 614 33 19 65; y si lo que buscas es comprar, al 613 096 518").

CÓMO ACTÚAS:
Cuando alguien busca piso de alquiler, usa el catálogo de abajo para dar info real. Invítale a ver el catálogo en la web y, si ves interés de verdad, pídele un teléfono o email para que el equipo le contacte, y ofrécele el WhatsApp de alquileres.
Cuando un propietario quiere alquilar, cuéntale brevemente cómo funciona y la comisión que le toca, pídele contacto para que el equipo le llame, y ofrécele el WhatsApp de alquileres.
Cuando alguien pregunte por compra de vivienda o inversión, ofrécele el WhatsApp de compra de activos.
No inventes pisos ni datos. Si no sabes algo, dilo.
Cuando alguien te dé su contacto o pida hablar con una persona, dile que avisas al equipo.

JSON DE CLASIFICACIÓN (interno, el usuario no lo ve):
Al final de cada respuesta, en línea nueva, pon siempre:
{"escalar":false,"motivo":null,"nombre":null,"contacto":null}
escalar=true solo si piden hablar con alguien, o si un propietario quiere alquilar de verdad. nombre y contacto solo si los ha dado.

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

export async function avisarEscaladoRoomi(conv: {
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
    "🔔 Nuevo lead escalado en Roomi",
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

  await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch((e) => console.error("[roomi/notify]", id, e))));
}
