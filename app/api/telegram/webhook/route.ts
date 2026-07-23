import { NextRequest, NextResponse } from "next/server";
import { telegramSendMessage } from "../../../../lib/telegram";
import { responderGladis } from "../../../../lib/gladis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const respuesta = await responderGladis(String(chatId), text);
    await telegramSendMessage(chatId, respuesta);
  } catch (e: unknown) {
    await telegramSendMessage(chatId, `Error: ${e instanceof Error ? e.message : "desconocido"}`);
  }

  return NextResponse.json({ ok: true });
}
