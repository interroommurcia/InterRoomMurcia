import { NextRequest, NextResponse } from "next/server";
import { telegramSendDocument, telegramSendMessage } from "../../../../lib/telegram";
import { calcularPendientes, formatearPendientes } from "../../../../lib/secretaria";
import { buscarDocumentosPorOperacion, descargarDocumento } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AYUDA = `Comandos disponibles:
/pendientes — leads sin contactar, teléfonos incompletos y alquileres sin cobrar este mes
/pdf <nombre> — busca y envía los documentos adjuntos a operaciones de ese cliente
/ayuda — esta lista`;

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const chatId = update?.message?.chat?.id;
  const text = typeof update?.message?.text === "string" ? update.message.text.trim() : "";

  const chatsAutorizados = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!chatId || !chatsAutorizados.includes(String(chatId)) || !text) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (text === "/pendientes") {
      const pendientes = await calcularPendientes();
      await telegramSendMessage(chatId, formatearPendientes(pendientes));
    } else if (text.startsWith("/pdf")) {
      const busqueda = text.replace("/pdf", "").trim();
      if (!busqueda) {
        await telegramSendMessage(chatId, "Uso: /pdf <nombre del cliente>");
      } else {
        const resultados = await buscarDocumentosPorOperacion(busqueda);
        if (resultados.length === 0) {
          await telegramSendMessage(chatId, `Sin documentos para "${busqueda}".`);
        } else {
          for (const { documento, clienteNombre } of resultados) {
            const archivo = await descargarDocumento(documento.id);
            if (archivo) await telegramSendDocument(chatId, archivo.buffer, archivo.nombre, clienteNombre);
          }
        }
      }
    } else {
      await telegramSendMessage(chatId, AYUDA);
    }
  } catch (e: unknown) {
    await telegramSendMessage(chatId, `Error: ${e instanceof Error ? e.message : "desconocido"}`);
  }

  return NextResponse.json({ ok: true });
}
