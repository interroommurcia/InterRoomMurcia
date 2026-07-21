import { supabase } from "./supabaseClient";

export type Zona = {
  slug: "ucam" | "umu" | "upct";
  universidad: string;
  barrio: string;
  titulo: string;
  intro: string;
  contenido: string[];
};

export type Piso = {
  id: string;
  slug: string;
  titulo: string;
  zona: Zona["slug"];
  barrio: string;
  precioMes: number;
  metros: number | null;
  descripcion: string;
  disponible: boolean;
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
  zona: Zona["slug"];
  barrio: string;
  precio_mes: number;
  metros: number | null;
  descripcion: string;
  disponible: boolean;
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
  };
}

export async function getPisos(): Promise<Piso[]> {
  const { data, error } = await supabase
    .from("pisos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPiso);
}

export async function pisosPorZona(zona: Zona["slug"]): Promise<Piso[]> {
  const { data, error } = await supabase.from("pisos").select("*").eq("zona", zona);
  if (error) throw error;
  return (data ?? []).map(mapPiso);
}

export async function pisoPorSlug(zona: Zona["slug"], slug: string): Promise<Piso | null> {
  const { data, error } = await supabase
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
