import { supabase } from "./supabaseClient";

export type ArticuloSection = { h2: string; content: string; highlight: string | null; image?: string };
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

export type Articulo = ArticuloResumen & {
  intro: string;
  sections: ArticuloSection[];
  cta: string;
  faq: ArticuloFAQ[];
  heroImage: string | null;
  heroImageCredit: string | null;
  heroImageCreditUrl: string | null;
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
  };
}

export async function getArticulosPublicados(): Promise<ArticuloResumen[]> {
  const { data, error } = await supabase
    .from("articulos")
    .select("id, slug, meta_title, meta_description, h1, keyword, hero_image_thumb, created_at")
    .eq("estado", "publicado")
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
