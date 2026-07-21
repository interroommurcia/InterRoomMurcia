import type { MetadataRoute } from "next";
import { zonas } from "../lib/pisos";
import { getSlugsPublicados } from "../lib/articulos";

// Mismo dominio que metadataBase (app/layout.tsx) y las URLs canónicas del blog.
const BASE_URL = "https://interroommurcia.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articulos = await getSlugsPublicados().catch(() => []);

  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/contacto`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.7 },
    ...zonas.map((z) => ({
      url: `${BASE_URL}/habitaciones/${z.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  const posts: MetadataRoute.Sitemap = articulos.map((a) => ({
    url: `${BASE_URL}/blog/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...estaticas, ...posts];
}
