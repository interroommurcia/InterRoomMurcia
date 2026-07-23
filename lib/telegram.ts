function apiUrl(method: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN no configurado");
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function telegramSendMessage(chatId: string | number, text: string) {
  const res = await fetch(apiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram sendMessage falló: ${await res.text()}`);
}

export async function telegramSendDocument(
  chatId: string | number,
  buffer: Buffer,
  filename: string,
  caption?: string
) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);

  const res = await fetch(apiUrl("sendDocument"), { method: "POST", body: form });
  if (!res.ok) throw new Error(`Telegram sendDocument falló: ${await res.text()}`);
}
