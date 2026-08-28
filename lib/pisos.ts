import { supabasePublic } from "./supabaseClient";

export type ZonaAlquiler = "ucam" | "umu" | "upct";
export type ZonaSlug = ZonaAlquiler | (string & {});

export type Zona = {
  slug: ZonaAlquiler;
  universidad: string;
  barrio: string;
  titulo: string;
  intro: string;
  contenido: string[];
};

export type CategoriaPiso = "alquiler" | "compraventa";

export type Piso = {
  id: string;
  slug: string;
  titulo: string;
  zona: ZonaSlug;
  barrio: string;
  precioMes: number;
  metros: number | null;
  descripcion: string;
  disponible: boolean;
  imageUrl: string | null;
  gallery: string[];
  videoUrl: string | null;
  categoria: CategoriaPiso;
};

export const zonas: Zona[] = [
  {
    slug: "ucam",
    universidad: "UCAM",
    barrio: "Guadalupe / La Ñora",
    titulo: "Habitaciones para estudiantes UCAM en Guadalupe y La Ñora",
    intro:
      "Habitaciones a pie o a pocos minutos en bus del campus de la Universidad Católica de Murcia, en Guadalupe y La Ñora.",
    contenido: [
      "El campus de la UCAM en Guadalupe concentra a buena parte de sus estudiantes de fuera de Murcia, y la mayoría busca alojamiento en los barrios cercanos antes que en el centro de la ciudad, por la comodidad de llegar a clase caminando o con un trayecto corto en autobús.",
      "Guadalupe y La Ñora son zonas residenciales tranquilas, con supermercados, farmacias y paradas de bus bien conectadas con el resto de Murcia. Los precios de las habitaciones suelen ser más ajustados que en el centro, lo que las convierte en la opción preferida de quienes buscan ahorrar en desplazamientos y en alquiler a la vez.",
      "En InterRoom verificamos cada piso antes de publicarlo: fotos reales, dirección aproximada y disponibilidad actualizada, para que no pierdas tiempo con anuncios desactualizados.",
    ],
  },
  {
    slug: "umu",
    universidad: "UMU",
    barrio: "Espinardo / La Merced",
    titulo: "Habitaciones para estudiantes UMU en Espinardo y el centro",
    intro:
      "Pisos cerca del campus de Espinardo y en el centro de Murcia, para estudiantes de la Universidad de Murcia.",
    contenido: [
      "La Universidad de Murcia reparte sus facultades entre el campus de Espinardo, el de La Merced en pleno centro, y otros edificios repartidos por la ciudad, así que la elección de zona depende mucho de qué facultad curses.",
      "Espinardo es la opción más habitual para carreras técnicas y de ciencias, con oferta de pisos compartidos orientada a estudiantes y buena conexión en bus. El centro y La Merced, en cambio, atraen a quienes prefieren tener ocio, comercios y vida universitaria a un paseo de casa, aunque el precio medio sube un poco.",
      "Filtra por barrio en el catálogo para comparar precios y disponibilidad real entre ambas zonas antes de decidir.",
    ],
  },
  {
    slug: "upct",
    universidad: "UPCT",
    barrio: "Cartagena centro",
    titulo: "Habitaciones para estudiantes UPCT en Cartagena",
    intro:
      "Habitaciones en el centro de Cartagena, a distancia andando de los campus de la Universidad Politécnica.",
    contenido: [
      "La Universidad Politécnica de Cartagena tiene sus campus repartidos por el centro histórico de la ciudad, lo que hace que la mayoría de estudiantes prefiera vivir en el propio centro, a un paseo corto de clase, en vez de depender del transporte.",
      "Es una oferta más reducida que en Murcia capital, así que las habitaciones buenas y bien conectadas suelen reservarse pronto, sobre todo antes del inicio de curso en septiembre.",
      "Si buscas para el curso que viene, te recomendamos activar avisos de disponibilidad en esta zona con antelación.",
    ],
  },
];

type PisoRow = {
  id: string;
  slug: string;
  titulo: string;
  zona: ZonaSlug;
  barrio: string;
  precio_mes: number;
  metros: number | null;
  descripcion: string;
  disponible: boolean;
  image_url: string | null;
  gallery: string[] | null;
  video_url: string | null;
  categoria: CategoriaPiso;
};

function mapPiso(row: PisoRow): Piso {
  return {
    id: row.id,
    slug: row.slug,
    titulo: row.titulo,
    zona: row.zona,
    barrio: row.barrio,
    precioMes: row.precio_mes,
    metros: row.metros,
    descripcion: row.descripcion,
    disponible: row.disponible,
    imageUrl: row.image_url,
    gallery: Array.isArray(row.gallery) ? row.gallery.filter((u): u is string => typeof u === "string") : [],
    videoUrl: row.video_url ?? null,
    categoria: row.categoria ?? "alquiler",
  };
}

function mapPisoCard(row: Pick<PisoRow, "id" | "slug" | "titulo" | "zona" | "barrio" | "precio_mes" | "disponible" | "image_url" | "categoria">): Piso {
  return {
    id: row.id,
    slug: row.slug,
    titulo: row.titulo,
    zona: row.zona,
    barrio: row.barrio,
    precioMes: row.precio_mes,
    metros: null,
    descripcion: "",
    disponible: row.disponible,
    imageUrl: row.image_url,
    gallery: [],
    videoUrl: null,
    categoria: row.categoria ?? "alquiler",
  };
}

const CARD_COLS = "id,slug,titulo,zona,barrio,precio_mes,disponible,image_url,categoria" as const;

export async function getPisos(): Promise<Piso[]> {
  const { data, error } = await supabasePublic
    .from("pisos")
    .select(CARD_COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPisoCard);
}

export async function pisosPorCategoria(categoria: CategoriaPiso): Promise<Piso[]> {
  const { data, error } = await supabasePublic
    .from("pisos")
    .select(CARD_COLS)
    .eq("categoria", categoria)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPisoCard);
}

export async function pisosPorZona(zona: ZonaSlug): Promise<Piso[]> {
  const { data, error } = await supabasePublic
    .from("pisos")
    .select(CARD_COLS)
    .eq("zona", zona);
  if (error) throw error;
  return (data ?? []).map(mapPisoCard);
}

export async function pisoPorSlug(zona: ZonaSlug, slug: string): Promise<Piso | null> {
  const { data, error } = await supabasePublic
    .from("pisos")
    .select("*")
    .eq("zona", zona)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPiso(data) : null;
}

export function zonaPorSlug(slug: string) {
  return zonas.find((z) => z.slug === slug);
}

export async function catalogSnapshot(): Promise<string> {
  const pisos = await getPisos();
  return zonas
    .map((z) => {
      const enZona = pisos.filter((p) => p.zona === z.slug);
      if (enZona.length === 0) return `${z.universidad} (${z.barrio}): sin habitaciones publicadas ahora mismo.`;
      const disponibles = enZona.filter((p) => p.disponible).length;
      const precios = enZona.map((p) => p.precioMes);
      return `${z.universidad} (${z.barrio}): ${enZona.length} habitaciones, ${disponibles} disponibles ahora, precios entre ${Math.min(...precios)}€ y ${Math.max(...precios)}€/mes.`;
    })
    .join("\n");
}
