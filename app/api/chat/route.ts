import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { catalogSnapshot } from "../../../lib/pisos";
import {
  crearConversacion,
  getConversacion,
  guardarMensajes,
  getKnowledgeBase,
  buildSystemPrompt,
  avisarEscaladoRoomi,
  type ChatMensaje,
} from "../../../lib/chat";

export const maxDuration = 60;

type Clasificacion = { escalar: boolean; motivo: string | null; nombre: string | null; contacto: string | null };

function parseClasificacion(raw: string): { textoLimpio: string; clasificacion: Clasificacion } {
  const defaultClasif: Clasificacion = { escalar: false, motivo: null, nombre: null, contacto: null };
  const match = raw.match(/\n?\s*(\{[\s\S]*\})\s*$/);
  if (!match) return { textoLimpio: raw, clasificacion: defaultClasif };

  const textoLimpio = raw.slice(0, match.index).trimEnd();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      textoLimpio,
      clasificacion: {
        escalar: Boolean(parsed.escalar),
        motivo: typeof parsed.motivo === "string" ? parsed.motivo.slice(0, 200) : null,
        nombre: typeof parsed.nombre === "string" && parsed.nombre.trim() ? parsed.nombre.slice(0, 120) : null,
        contacto: typeof parsed.contacto === "string" && parsed.contacto.trim() ? parsed.contacto.slice(0, 120) : null,
      },
    };
  } catch {
    return { textoLimpio: raw, clasificacion: defaultClasif };
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  const pagina = typeof body?.pagina === "string" ? body.pagina.slice(0, 200) : null;

  if (!message) return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey });

  const conversacion = conversationId
    ? (await getConversacion(conversationId)) ?? (await crearConversacion(pagina))
    : await crearConversacion(pagina);

  const mensajesPrevios = conversacion.mensajes ?? [];
  const nuevoMensajeUsuario: ChatMensaje = { role: "user", text: message, at: new Date().toISOString() };
  const mensajesConUsuario = [...mensajesPrevios, nuevoMensajeUsuario];

  const [catalogo, knowledgeBase] = await Promise.all([catalogSnapshot(), getKnowledgeBase()]);

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: buildSystemPrompt(catalogo, knowledgeBase),
    messages: mensajesConUsuario.map((m) => ({ role: m.role, content: m.text })),
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        const { textoLimpio, clasificacion } = parseClasificacion(fullText);

        const mensajesFinales: ChatMensaje[] = [
          ...mensajesConUsuario,
          { role: "assistant", text: textoLimpio, at: new Date().toISOString() },
        ];
        await guardarMensajes(conversacion.id, mensajesFinales, clasificacion);

        if (clasificacion.escalar && conversacion.estado !== "escalada") {
          avisarEscaladoRoomi({
            id: conversacion.id,
            nombre: clasificacion.nombre ?? conversacion.nombre,
            contacto: clasificacion.contacto ?? conversacion.contacto,
            motivo_escalado: clasificacion.motivo,
            pagina_origen: conversacion.pagina_origen,
            mensajes: mensajesFinales,
          }).catch((e) => console.error("[chat/escalado-notify]", e));
        }

        controller.close();
      } catch (err: unknown) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Conversation-Id": conversacion.id,
    },
  });
}
