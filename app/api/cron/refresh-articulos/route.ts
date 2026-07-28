import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { telegramSendMessage } from "../../../../lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DIAS_STALE = 180;
const REGEX_AÑO_ANTIGUO = /\b(202[0-4])\b/;

type Row = {
  slug: string;
  h1: string;
  intro: string | null;
  sections: { content: string }[] | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  // Vercel Cron incluye el header 'authorization: Bearer <CRON_SECRET>'. En
  // dev permitimos pasar sin auth para poder probar.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("articulos")
    .select("slug, h1, intro, sections, created_at")
    .eq("estado", "publicado");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ahora = Date.now();
  const staleAntiguos: string[] = [];
  const staleAño: string[] = [];

  for (const row of (data ?? []) as Row[]) {
    const dias = Math.floor((ahora - new Date(row.created_at).getTime()) / 86400000);
    const textoCompleto = [row.h1, row.intro ?? "", ...(row.sections ?? []).map((s) => s.content ?? "")].join(" ");
    const añoAntiguo = REGEX_AÑO_ANTIGUO.exec(textoCompleto);
    if (añoAntiguo) staleAño.push(`${row.slug} (menciona ${añoAntiguo[0]})`);
    else if (dias >= DIAS_STALE) staleAntiguos.push(`${row.slug} (${dias}d)`);
  }

  if (staleAntiguos.length === 0 && staleAño.length === 0) {
    return NextResponse.json({ ok: true, staleAntiguos, staleAño, message: "sin artículos que refrescar" });
  }

  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const lineas = ["📰 Artículos que conviene refrescar"];
  if (staleAño.length) {
    lineas.push("\n🗓️ Con año antiguo en el contenido:");
    staleAño.forEach((s) => lineas.push(`- ${s}`));
  }
  if (staleAntiguos.length) {
    lineas.push(`\n⏰ Publicados hace más de ${DIAS_STALE} días:`);
    staleAntiguos.forEach((s) => lineas.push(`- ${s}`));
  }
  const texto = lineas.join("\n");
  await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch((e) => console.error("[refresh-articulos]", id, e))));

  return NextResponse.json({ ok: true, staleAntiguos, staleAño });
}
