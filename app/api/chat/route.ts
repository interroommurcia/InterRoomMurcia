import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { catalogSnapshot } from "../../../lib/pisos";
import {
  crearConversacion,
  getConversacion,
  guardarMensajes,
  getKnowledgeBase,
  type ChatMensaje,
} from "../../../lib/chat";

export const maxDuration = 60;

function buildSystemPrompt(catalogo: string, knowledgeBase: string) {
  return `Eres Rommi, el asistente virtual de InterRoom Murcia, disponible 24 horas en la web. Si te preguntan tu nombre, respondes que eres Rommi. InterRoom Murcia ayuda a:
1) estudiantes a encontrar habitaciones de alquiler cerca de la UCAM, la UMU y la UPCT en Murcia y Cartagena.
2) propietarios a alquilar su vivienda a estudiantes verificados, gestionando el alquiler a cambio de una comisión del 15% + IVA sobre el beneficio generado.

Tono: cercano, breve, resolutivo. Respuestas de 2 a 4 frases, en español, sin inventar datos que no tengas.

Si preguntan por habitaciones concretas, usa el CATÁLOGO ACTUAL de abajo y dirígeles a /#catalogo o a la zona de su universidad (/habitaciones/ucam, /habitaciones/umu, /habitaciones/upct) en vez de inventar detalles de un piso que no conoces.

Si son propietarios que quieren alquilar su vivienda, explica brevemente el servicio y la comisión, y ofrece pasar sus datos al equipo.

Si alguien pide hablar con una persona, quiere que le llamen, o es un propietario con intención real de alquilar, dilo explícitamente en tu respuesta (por ejemplo "Ahora aviso al equipo para que te contacte") — el sistema se encarga de escalar la conversación automáticamente, tú no tienes que hacer nada técnico, solo reconocerlo en tu respuesta.

CATÁLOGO ACTUAL:
${catalogo}

INFORMACIÓN ADICIONAL DEL NEGOCIO:
${knowledgeBase || "(sin información adicional configurada)"}`;
}

type Clasificacion = { escalar: boolean; motivo: string | null; nombre: string | null; contacto: string | null };

function parseClasificacion(raw: string): Clasificacion {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    return {
      escalar: Boolean(parsed.escalar),
      motivo: typeof parsed.motivo === "string" ? parsed.motivo.slice(0, 200) : null,
      nombre: typeof parsed.nombre === "string" && parsed.nombre.trim() ? parsed.nombre.slice(0, 120) : null,
      contacto: typeof parsed.contacto === "string" && parsed.contacto.trim() ? parsed.contacto.slice(0, 120) : null,
    };
  } catch {
    return { escalar: false, motivo: null, nombre: null, contacto: null };
  }
}

async function clasificarConversacion(anthropic: Anthropic, mensajes: ChatMensaje[]): Promise<Clasificacion> {
  const transcripcion = mensajes.map((m) => `${m.role === "user" ? "Usuario" : "Asistente"}: ${m.text}`).join("\n");
  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        "Analizas transcripciones de un chat de atención al cliente de una inmobiliaria de alquiler de habitaciones para estudiantes. Devuelve ÚNICAMENTE un JSON (sin texto extra) con esta forma: " +
        '{"escalar": boolean, "motivo": string o null, "nombre": string o null, "contacto": string o null}. ' +
        'Pon escalar=true si el usuario pide explícitamente una llamada, hablar con una persona humana, o es un propietario con intención real de alquilar su vivienda. "nombre" y "contacto" solo si el usuario los ha dado en el chat (email o teléfono). Si no hay motivo de escalar, escalar=false y el resto null.',
      messages: [{ role: "user", content: transcripcion }],
    });
    const block = res.content[0];
    const text = block?.type === "text" ? block.text : "";
    return parseClasificacion(text);
  } catch {
    return { escalar: false, motivo: null, nombre: null, contacto: null };
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
    max_tokens: 500,
    system: buildSystemPrompt(catalogo, knowledgeBase),
    messages: mensajesConUsuario.map((m) => ({ role: m.role, content: m.text })),
  });

  const encoder = new TextEncoder();
  let assistantText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            assistantText += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        const mensajesFinales: ChatMensaje[] = [
          ...mensajesConUsuario,
          { role: "assistant", text: assistantText, at: new Date().toISOString() },
        ];
        const clasificacion = await clasificarConversacion(anthropic, mensajesFinales);
        await guardarMensajes(conversacion.id, mensajesFinales, clasificacion);

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
