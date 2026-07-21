import { createClient } from "@supabase/supabase-js";

// Cliente propio (no el compartido de lib/supabaseClient) para forzar
// "no-store": el blog es force-dynamic y necesita reflejar publicaciones al
// instante, mientras que otras páginas públicas (home, zonas) siguen
// generándose de forma estática con el cliente compartido.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});

export type ArticuloSection = { h2: string; content: string; highlight: string | null; image?: string; video?: string };
export type ArticuloFAQ = { question: string; answer: string };

export type ArticuloResumen = {
  id: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  keyword: string | null;
  heroImageThumb: string | null;
  createdAt: string;
};

export type ArticuloTemplate = "clasico" | "minimalista" | "revista";

export type Articulo = ArticuloResumen & {
  intro: string;
  sections: ArticuloSection[];
  cta: string;
  faq: ArticuloFAQ[];
  heroImage: string | null;
  heroImageCredit: string | null;
  heroImageCreditUrl: string | null;
  template: ArticuloTemplate;
};

type ArticuloRow = {
  id: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  sections: ArticuloSection[];
  cta: string;
  faq: ArticuloFAQ[];
  keyword: string | null;
  hero_image: string | null;
  hero_image_thumb: string | null;
  hero_image_credit: string | null;
  hero_image_credit_url: string | null;
  created_at: string;
  template: ArticuloTemplate;
};

function mapArticulo(row: ArticuloRow): Articulo {
  return {
    id: row.id,
    slug: row.slug,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    h1: row.h1,
    intro: row.intro,
    sections: row.sections ?? [],
    cta: row.cta,
    faq: row.faq ?? [],
    keyword: row.keyword,
    heroImage: row.hero_image,
    heroImageThumb: row.hero_image_thumb,
    heroImageCredit: row.hero_image_credit,
    heroImageCreditUrl: row.hero_image_credit_url,
    createdAt: row.created_at,
    template: row.template,
  };
}

export async function getArticulosPublicados(): Promise<ArticuloResumen[]> {
  const { data, error } = await supabase
    .from("articulos")
    .select("id, slug, meta_title, meta_description, h1, keyword, hero_image_thumb, created_at")
    .eq("estado", "publicado")
    .eq("mostrar_en_listado", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    h1: row.h1,
    keyword: row.keyword,
    heroImageThumb: row.hero_image_thumb,
    createdAt: row.created_at,
  }));
}

export async function getSlugsPublicados(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data, error } = await supabase
    .from("articulos")
    .select("slug, created_at")
    .eq("estado", "publicado");
  if (error) throw error;
  return (data ?? []).map((row) => ({ slug: row.slug, updatedAt: row.created_at }));
}

export async function getArticuloPorSlug(slug: string): Promise<Articulo | null> {
  const { data, error } = await supabase
    .from("articulos")
    .select("*")
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();
  if (error) throw error;
  return data ? mapArticulo(data) : null;
}
