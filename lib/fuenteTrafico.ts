// Clasificación de la fuente de tráfico. Importante: los motores de IA
// (ChatGPT, Perplexity…) suelen llegar SIN referrer y se identifican por el
// utm_source que añaden al enlace (p. ej. utm_source=chatgpt.com). Por eso
// miramos primero el utm_source y luego el referrer: si solo miras el referrer,
// todo el tráfico de IA cae en "directo" y cuentas 0% de IA.

// Motores de IA generativa (para el desglose "tráfico de IA").
export const FUENTES_IA = new Set(["chatgpt", "claude", "grok", "gemini", "perplexity", "copilot"]);

export function esFuenteIA(key: string): boolean {
  return FUENTES_IA.has(key);
}

// Clasifica una cadena (host de referrer o valor de utm_source) en una fuente.
function matchFuente(s: string): string | null {
  const r = s.toLowerCase();
  if (r.includes("chatgpt") || r.includes("openai")) return "chatgpt";
  if (r.includes("claude") || r.includes("anthropic")) return "claude";
  if (r.includes("grok") || r.includes("x.ai")) return "grok";
  if (r.includes("gemini") || r.includes("bard")) return "gemini";
  if (r.includes("perplexity")) return "perplexity";
  if (r.includes("copilot") || r.includes("bing")) return "copilot";
  if (r.includes("duckduckgo")) return "duckduckgo";
  if (r.includes("google")) return "google";
  if (r.includes("instagram")) return "instagram";
  if (r.includes("linkedin")) return "linkedin";
  if (r.includes("twitter") || r.includes("t.co") || r.includes("x.com")) return "x";
  if (r.includes("facebook") || r.includes("fb.")) return "facebook";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "whatsapp";
  if (r.includes("tiktok")) return "tiktok";
  if (r.includes("youtube") || r.includes("youtu.be")) return "youtube";
  if (r.includes("reddit")) return "reddit";
  return null;
}

export function clasificarFuente(referrer: string | null, utmSource: string | null): string {
  // 1) utm_source manda (ChatGPT y otros vienen así, sin referrer).
  if (utmSource) {
    const m = matchFuente(utmSource);
    if (m) return m;
  }
  // 2) Referrer.
  if (referrer) {
    const m = matchFuente(referrer);
    if (m) return m;
    return "other";
  }
  return "direct";
}
