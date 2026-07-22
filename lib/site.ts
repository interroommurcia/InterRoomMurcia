// Fuente unica de la URL publica del sitio. Hoy interroommurcia.com sirve un
// WordPress distinto, asi que todo (metadataBase, sitemap, robots, canonical)
// apunta a la URL real de Vercel hasta que se migre el dominio: entonces basta
// con cambiar NEXT_PUBLIC_SITE_URL en Vercel, sin tocar código.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://inter-room-murcia.vercel.app";
