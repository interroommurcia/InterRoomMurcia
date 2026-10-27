import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  // Bots de buscadores y de IA generativa (ChatGPT, Perplexity, Claude, Gemini…).
  // Ya entran por la regla "*", pero los declaramos explícitamente para dejar
  // claro que pueden indexar el contenido (clave para GEO) y nunca el panel.
  const iaBots = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "ClaudeBot",
    "Claude-Web",
    "Google-Extended",
    "Applebot-Extended",
    "CCBot",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/admin" },
      { userAgent: iaBots, allow: "/", disallow: "/admin" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
