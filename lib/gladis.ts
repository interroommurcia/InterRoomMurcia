import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { listarLeads } from "./leads";
import { listarClientes, buscarDocumentosPorOperacion, descargarDocumento } from "./contabilidad";
import { calcularPendientes, formatearPendientes } from "./secretaria";
import { telegramSendDocument } from "./telegram";

const MAX_HISTORIAL = 20;
const MAX_TURNOS_HERRAMIENTA = 5;

type Turno = { role: "user" | "assistant"; text: string };

const SYSTEM = `Eres Gladis, la secretaria interna de InterRoom Murcia. Trabajas por Telegram, para el equipo (hoy el fundador, en el futuro más empleados). Tu trabajo es responder con datos reales usando las herramientas disponibles, nunca inventar cifras, teléfonos o nombres.

Tono: directo, profesional, breve. Respondes en español.

Guía de uso de herramientas:
- Si te piden localizar a alguien por teléfono, usa buscar_por_telefono.
- Si preguntan qué hay pendiente (leads sin contactar, teléfonos incompletos, alquileres sin cobrar), usa listar_pendientes.
- Si piden un documento/PDF de un cliente u operación, usa buscar_documentos primero; si hay un resultado claro (o el usuario confirma cuál), usa enviar_documento con su id para mandarlo a este mismo chat.
- Si ninguna herramienta resuelve la pregunta, dilo con claridad en vez de inventar una respuesta.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_por_telefono",
    description:
      "Busca un lead (sin convertir) o un cliente ya creado en Contabilidad por número de teléfono, completo o parcial, con o sin prefijo.",
    input_schema: {
      type: "object",
      properties: { telefono: { type: "string", description: "Número de teléfono completo o parcial" } },
      required: ["telefono"],
    },
  },
  {
    name: "listar_pendientes",
    description:
      "Devuelve leads sin contactar hace más de 3 días, clientes con teléfono incompleto y alquileres del mes actual sin marcar como cobrados.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_documentos",
    description: "Busca documentos (PDFs) adjuntos a operaciones de compraventa que coincidan con el nombre de un cliente.",
    input_schema: {
      type: "object",
      properties: { nombre: { type: "string", description: "Nombre o parte del nombre del cliente" } },
      required: ["nombre"],
    },
  },
  {
    name: "enviar_documento",
    description: "Envía por Telegram, a esta misma conversación, un documento ya localizado con buscar_documentos.",
    input_schema: {
      type: "object",
      properties: { documento_id: { type: "string", description: "id del documento devuelto por buscar_documentos" } },
      required: ["documento_id"],
    },
  },
];

function telefonoDigits(s: string) {
  return s.replace(/\D/g, "");
}

async function getHistorial(chatId: string): Promise<Turno[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("gladis_conversaciones").select("mensajes").eq("chat_id", chatId).maybeSingle();
  return (data?.mensajes as Turno[]) ?? [];
}

async function guardarHistorial(chatId: string, mensajes: Turno[]) {
  const admin = getSupabaseAdmin();
  await admin
    .from("gladis_conversaciones")
    .upsert({ chat_id: chatId, mensajes: mensajes.slice(-MAX_HISTORIAL), updated_at: new Date().toISOString() });
}

async function ejecutarHerramienta(nombre: string, input: Record<string, unknown>, chatId: string): Promise<string> {
  if (nombre === "buscar_por_telefono") {
    const q = telefonoDigits(String(input.telefono ?? ""));
    if (!q) return "Número vacío.";
    const [leads, clientes] = await Promise.all([listarLeads(), listarClientes()]);
    const leadsMatch = leads.filter((l) => telefonoDigits(l.telefono).includes(q));
    const clientesMatch = clientes.filter((c) => telefonoDigits(c.telefono ?? "").includes(q));
    if (!leadsMatch.length && !clientesMatch.length) return "Sin coincidencias para ese teléfono.";
    const partes: string[] = [];
    leadsMatch.forEach((l) =>
      partes.push(`LEAD (sin convertir): ${l.nombre} · ${l.telefono} · ${l.direccion} · recibido ${new Date(l.created_at).toLocaleDateString("es-ES")}`)
    );
    clientesMatch.forEach((c) =>
      partes.push(
        `CLIENTE: ${c.nombre} ${c.apellidos ?? ""} · ${c.tipo} · ${c.telefono} · ${c.email ?? "sin email"}${c.mensualidad > 0 ? ` · mensualidad ${c.mensualidad}€` : ""}`
      )
    );
    return partes.join("\n");
  }
  if (nombre === "listar_pendientes") {
    return formatearPendientes(await calcularPendientes());
  }
  if (nombre === "buscar_documentos") {
    const resultados = await buscarDocumentosPorOperacion(String(input.nombre ?? ""));
    if (!resultados.length) return "Sin documentos para esa búsqueda.";
    return resultados.map((r) => `id=${r.documento.id} · ${r.documento.nombre} · cliente ${r.clienteNombre}`).join("\n");
  }
  if (nombre === "enviar_documento") {
    const doc = await descargarDocumento(String(input.documento_id ?? ""));
    if (!doc) return "Documento no encontrado.";
    await telegramSendDocument(chatId, doc.buffer, doc.nombre);
    return `Enviado: ${doc.nombre}`;
  }
  return "Herramienta desconocida.";
}

export async function responderGladis(chatId: string, mensajeUsuario: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Falta configurar ANTHROPIC_API_KEY.";
  const anthropic = new Anthropic({ apiKey });

  const historial = await getHistorial(chatId);
  const messages: Anthropic.MessageParam[] = historial.map((t) => ({ role: t.role, content: t.text }));
  messages.push({ role: "user", content: mensajeUsuario });

  let respuestaFinal = "";
  for (let i = 0; i < MAX_TURNOS_HERRAMIENTA; i++) {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    respuestaFinal = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (res.stop_reason !== "tool_use") break;

    messages.push({ role: "assistant", content: res.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type === "tool_use") {
        const resultado = await ejecutarHerramienta(block.name, block.input as Record<string, unknown>, chatId);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultado });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  const nuevoHistorial: Turno[] = [
    ...historial,
    { role: "user", text: mensajeUsuario },
    { role: "assistant", text: respuestaFinal || "(sin respuesta)" },
  ];
  await guardarHistorial(chatId, nuevoHistorial);

  return respuestaFinal || "No he podido generar una respuesta.";
}
