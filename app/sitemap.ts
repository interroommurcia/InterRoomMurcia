import type { MetadataRoute } from "next";
import { zonas, getPisos } from "../lib/pisos";
import { getSlugsPublicados } from "../lib/articulos";
import { SITE_URL as BASE_URL } from "../lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articulos, pisos] = await Promise.all([
    getSlugsPublicados().catch(() => []),
    getPisos().catch(() => []),
  ]);

  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/contacto`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/venta`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/inversores`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/comparador-luz`, changeFrequency: "monthly", priority: 0.5 },
    ...zonas.map((z) => ({
      url: `${BASE_URL}/habitaciones/${z.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  // Fichas individuales de habitación (todas las que NO están dadas de baja).
  const fichas: MetadataRoute.Sitemap = pisos
    .filter((p) => p.estado !== "no_disponible")
    .map((p) => ({
      url: `${BASE_URL}/habitaciones/${p.zona}/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const posts: MetadataRoute.Sitemap = articulos.map((a) => ({
    url: `${BASE_URL}/blog/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...estaticas, ...fichas, ...posts];
}
