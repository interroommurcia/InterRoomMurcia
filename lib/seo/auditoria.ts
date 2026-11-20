import { getSupabaseAdmin } from "../supabaseAdmin";

// ─────────────────────────────────────────────────────────────────
// Auditoría de contenido (SEO + GEO) sobre los artículos del blog.
// Evalúa cada artículo contra señales reales que usan el algoritmo de
// búsqueda y las IAs generativas, y genera una lista priorizada de tareas.
// No inventa datos: todo sale del contenido real guardado en Supabase.
// ─────────────────────────────────────────────────────────────────

export type Severidad = "alta" | "media" | "baja";

export type Check = {
  id: string;
  label: string;
  ok: boolean;
  severidad: Severidad;
  puntos: number; // peso del check en la nota
  fix: string; // qué hacer si falla
};

export type ArticuloAuditoria = {
  id: string;
  slug: string;
  titulo: string;
  keyword: string | null;
  nota: number; // 0-100
  palabras: number;
  checks: Check[];
  fallos: Check[]; // checks no superados, ordenados por severidad
};

export type TareaGlobal = {
  severidad: Severidad;
  titulo: string;
  detalle: string;
  afectados: number; // nº de artículos afectados
};

export type AuditoriaContenido = {
  totalArticulos: number;
  notaMedia: number;
  distribucion: { buenos: number; mejorables: number; flojos: number }; // >=80 / 50-79 / <50
  articulos: ArticuloAuditoria[];
  tareas: TareaGlobal[];
  searchConsole: { conectado: boolean; motivo: string };
};

const PESOS: Record<Severidad, number> = { alta: 18, media: 10, baja: 5 };

function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ");
}

function contarPalabras(s: string): number {
  const limpio = stripHtml(s).trim();
  if (!limpio) return 0;
  return limpio.split(/\s+/).filter(Boolean).length;
}

function incluye(texto: string | null | undefined, termino: string | null | undefined): boolean {
  if (!texto || !termino) return false;
  return texto.toLowerCase().includes(termino.toLowerCase());
}

type Row = {
  id: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  keyword: string | null;
  intro: string | null;
  sections: { h2: string; content: string }[] | null;
  cta: string | null;
  faq: { question: string; answer: string }[] | null;
  fuentes: { label: string; url: string }[] | null;
  hero_image: string | null;
  hero_image_thumb: string | null;
};

function auditarArticulo(r: Row): ArticuloAuditoria {
  const kw = r.keyword?.trim() || null;
  const titulo = r.meta_title || r.h1 || r.slug;
  const metaLen = (r.meta_description || "").trim().length;
  const titLen = (r.meta_title || "").trim().length;
  const secciones = r.sections ?? [];
  const faq = r.faq ?? [];
  const fuentes = r.fuentes ?? [];

  const palabras = contarPalabras([r.intro || "", ...secciones.map((s) => `${s.h2} ${s.content}`)].join(" "));

  const checks: Check[] = [
    {
      id: "keyword",
      label: "Keyword objetivo definida",
      ok: !!kw,
      severidad: "alta",
      puntos: PESOS.alta,
      fix: "Define la palabra clave que quieres posicionar. Sin ella no puedes optimizar nada.",
    },
    {
      id: "kw-title",
      label: "Keyword en el título SEO",
      ok: !kw || incluye(r.meta_title, kw),
      severidad: "alta",
      puntos: PESOS.alta,
      fix: "Incluye la keyword en el meta title, a ser posible al principio. Es la señal nº1 de relevancia.",
    },
    {
      id: "title-len",
      label: "Longitud del título (30–60)",
      ok: titLen >= 30 && titLen <= 60,
      severidad: "media",
      puntos: PESOS.media,
      fix: `Tu título mide ${titLen} caracteres. Ajústalo a 30–60 para que no se corte en Google.`,
    },
    {
      id: "kw-meta",
      label: "Keyword en la meta descripción",
      ok: !kw || incluye(r.meta_description, kw),
      severidad: "media",
      puntos: PESOS.media,
      fix: "Mete la keyword (y una llamada a la acción) en la meta descripción: sube el CTR en resultados.",
    },
    {
      id: "meta-len",
      label: "Longitud de la meta (120–160)",
      ok: metaLen >= 120 && metaLen <= 160,
      severidad: "media",
      puntos: PESOS.media,
      fix: `Tu meta mide ${metaLen} caracteres. Llévala a 120–160 para aprovechar todo el espacio del snippet.`,
    },
    {
      id: "kw-h1",
      label: "Keyword en el H1",
      ok: !kw || incluye(r.h1, kw),
      severidad: "media",
      puntos: PESOS.media,
      fix: "El H1 (titular visible) debe contener la keyword. Refuerza de qué va la página.",
    },
    {
      id: "profundidad",
      label: "Contenido con cuerpo (≥700 palabras)",
      ok: palabras >= 700,
      severidad: palabras < 400 ? "alta" : "media",
      puntos: palabras < 400 ? PESOS.alta : PESOS.media,
      fix: `Tiene ${palabras} palabras. Google premia la cobertura completa: desarrolla hasta 900–1500 respondiendo dudas reales.`,
    },
    {
      id: "secciones",
      label: "Estructura en secciones (≥3 H2)",
      ok: secciones.length >= 3,
      severidad: "media",
      puntos: PESOS.media,
      fix: `Tiene ${secciones.length} secciones. Divide en 3+ bloques con H2 descriptivos: mejora lectura y relevancia temática.`,
    },
    {
      id: "faq",
      label: "Bloque FAQ (≥3 preguntas)",
      ok: faq.length >= 3,
      severidad: "alta",
      puntos: PESOS.alta,
      fix: `Tiene ${faq.length} preguntas. Añade 3+ con respuestas de 2–3 frases: es el formato que citan ChatGPT/Perplexity y gana fragmentos destacados (GEO).`,
    },
    {
      id: "fuentes",
      label: "Fuentes externas con autoridad",
      ok: fuentes.length >= 1,
      severidad: "baja",
      puntos: PESOS.baja,
      fix: "Cita 1–2 fuentes fiables (INE, portales, prensa). Refuerza E-E-A-T, lo que Google y las IAs valoran para fiarse de ti.",
    },
    {
      id: "imagen",
      label: "Imagen de portada",
      ok: !!(r.hero_image || r.hero_image_thumb),
      severidad: "baja",
      puntos: PESOS.baja,
      fix: "Añade imagen de portada: mejora el CTR en redes/IA y da contexto visual.",
    },
  ];

  const total = checks.reduce((s, c) => s + c.puntos, 0);
  const ganados = checks.filter((c) => c.ok).reduce((s, c) => s + c.puntos, 0);
  const nota = total > 0 ? Math.round((ganados / total) * 100) : 0;

  const ordenSev: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };
  const fallos = checks.filter((c) => !c.ok).sort((a, b) => ordenSev[a.severidad] - ordenSev[b.severidad]);

  return { id: r.id, slug: r.slug, titulo, keyword: kw, nota, palabras, checks, fallos };
}

export async function auditarContenido(): Promise<AuditoriaContenido> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("articulos")
    .select("id, slug, meta_title, meta_description, h1, keyword, intro, sections, cta, faq, fuentes, hero_image, hero_image_thumb, estado, created_at")
    .eq("estado", "publicado")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const articulos = rows.map(auditarArticulo);

  const notaMedia = articulos.length
    ? Math.round(articulos.reduce((s, a) => s + a.nota, 0) / articulos.length)
    : 0;

  const distribucion = {
    buenos: articulos.filter((a) => a.nota >= 80).length,
    mejorables: articulos.filter((a) => a.nota >= 50 && a.nota < 80).length,
    flojos: articulos.filter((a) => a.nota < 50).length,
  };

  // Tareas globales: agrupa los fallos por tipo de check y cuenta artículos.
  const porCheck = new Map<string, { check: Check; afectados: number }>();
  for (const a of articulos) {
    for (const f of a.fallos) {
      const prev = porCheck.get(f.id);
      if (prev) prev.afectados += 1;
      else porCheck.set(f.id, { check: f, afectados: 1 });
    }
  }
  const ordenSev: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };
  const tareas: TareaGlobal[] = Array.from(porCheck.values())
    .map(({ check, afectados }) => ({
      severidad: check.severidad,
      titulo: tituloTarea(check.id, afectados),
      detalle: check.fix,
      afectados,
    }))
    .sort((a, b) => ordenSev[a.severidad] - ordenSev[b.severidad] || b.afectados - a.afectados);

  const searchConsole = estadoSearchConsole();

  return { totalArticulos: articulos.length, notaMedia, distribucion, articulos, tareas, searchConsole };
}

function tituloTarea(checkId: string, n: number): string {
  const plural = n === 1 ? "1 artículo" : `${n} artículos`;
  const mapa: Record<string, string> = {
    keyword: `${plural} sin keyword objetivo`,
    "kw-title": `${plural} sin la keyword en el título`,
    "title-len": `${plural} con el título mal dimensionado`,
    "kw-meta": `${plural} sin la keyword en la meta`,
    "meta-len": `${plural} con la meta mal dimensionada`,
    "kw-h1": `${plural} sin la keyword en el H1`,
    profundidad: `${plural} demasiado cortos`,
    secciones: `${plural} con poca estructura (H2)`,
    faq: `${plural} sin bloque FAQ`,
    enlaces: `${plural} con pocos enlaces internos`,
    fuentes: `${plural} sin fuentes externas`,
    imagen: `${plural} sin imagen de portada`,
  };
  return mapa[checkId] || `${plural} a revisar`;
}

// Google Search Console: queda preparado. Se activará cuando se configuren las
// credenciales (OAuth / service account) en variables de entorno.
function estadoSearchConsole(): { conectado: boolean; motivo: string } {
  const hay =
    !!process.env.GSC_CLIENT_EMAIL && !!process.env.GSC_PRIVATE_KEY && !!process.env.GSC_SITE_URL;
  return {
    conectado: hay,
    motivo: hay
      ? "Credenciales detectadas."
      : "Sin conectar. Da de alta interroommurcia.com en Google Search Console y añade las credenciales (GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL) para traer búsquedas reales, posición media y CTR.",
  };
}
