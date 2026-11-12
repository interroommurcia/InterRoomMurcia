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

export async function telegramSendPhoto(
  chatId: string | number,
  buffer: Buffer,
  filename: string,
  contentType: string,
  caption?: string
) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append("photo", new Blob([new Uint8Array(buffer)], { type: contentType }), filename);

  const res = await fetch(apiUrl("sendPhoto"), { method: "POST", body: form });
  if (!res.ok) throw new Error(`Telegram sendPhoto falló: ${await res.text()}`);
}

/**
 * Avisa al admin (TELEGRAM_CHAT_ID) por Telegram de que se ha enviado
 * con éxito un email desde la web, para que revise la bandeja de entrada.
 * No lanza: los fallos de Telegram nunca deben romper el envío del email.
 */
export async function notificarAdminEmailEnviado(
  destinatario: string | string[],
  asunto: string,
  contexto?: string,
): Promise<void> {
  // Registrar en BD para el aviso de la home de admin (silencioso si falla:
  // puede faltar la migración o Supabase estar caído, y no queremos romper el envío).
  try {
    const { registrarEmailEnviado } = await import("./emailsAdmin");
    await registrarEmailEnviado(destinatario, asunto, contexto);
  } catch {
    // intencional: el aviso en Telegram sigue adelante
  }

  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chatIds.length) return;
  const to = Array.isArray(destinatario) ? destinatario.join(", ") : destinatario;
  const texto = `📧 Email enviado desde la web\n\nPara: ${to}\nAsunto: ${asunto}${contexto ? `\n${contexto}` : ""}\n\nRevisa tu bandeja de entrada.`;
  await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch(() => undefined)));
}
