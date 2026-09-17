import { SITE_URL } from "./site";

const ORIGENES_CONOCIDOS: [string, string][] = [
  ["chatgpt.com", "ChatGPT"],
  ["openai.com", "ChatGPT"],
  ["wa.me", "WhatsApp"],
  ["whatsapp.com", "WhatsApp"],
  ["google.", "Google"],
  ["instagram.com", "Instagram"],
  ["facebook.com", "Facebook"],
  ["tiktok.com", "TikTok"],
  ["bing.com", "Bing"],
];

export function detectarOrigen(): string {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) return utmSource.slice(0, 60);

  const ref = document.referrer;
  if (!ref) return "Directo / sin referencia";

  try {
    const refUrl = new URL(ref);
    const host = refUrl.hostname.replace(/^www\./, "");
    const siteHost = new URL(SITE_URL).hostname.replace(/^www\./, "");
    if (host === siteHost) {
      if (refUrl.pathname.startsWith("/blog/")) {
        return `Blog: ${refUrl.pathname.replace("/blog/", "")}`.slice(0, 120);
      }
      return `Interno: ${refUrl.pathname || "/"}`.slice(0, 120);
    }
    const conocido = ORIGENES_CONOCIDOS.find(([pattern]) => host.includes(pattern));
    return conocido ? conocido[1] : host;
  } catch {
    return "Directo / sin referencia";
  }
}
