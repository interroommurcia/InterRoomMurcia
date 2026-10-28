// Post-procesado de contenido de artículos: convierte menciones de zonas y
// universidades en enlaces internos hacia sus páginas correspondientes. Solo
// enlaza la primera aparición de cada término por párrafo para no saturar.

type Rule = { pattern: RegExp; href: string; zona: "ucam" | "umu" | "upct" };

const RULES: Rule[] = [
  { pattern: /\bUCAM\b/i, href: "/habitaciones/ucam", zona: "ucam" },
  { pattern: /\bUMU\b/i, href: "/habitaciones/umu", zona: "umu" },
  { pattern: /\bUPCT\b/i, href: "/habitaciones/upct", zona: "upct" },
  { pattern: /\bUniversidad Cat[oó]lica( de Murcia)?\b/i, href: "/habitaciones/ucam", zona: "ucam" },
  { pattern: /\bUniversidad de Murcia\b/i, href: "/habitaciones/umu", zona: "umu" },
  { pattern: /\bUniversidad Polit[eé]cnica( de Cartagena)?\b/i, href: "/habitaciones/upct", zona: "upct" },
  { pattern: /\bGuadalupe\b/i, href: "/habitaciones/ucam", zona: "ucam" },
  { pattern: /\bLa Ñora\b/i, href: "/habitaciones/ucam", zona: "ucam" },
  { pattern: /\bEspinardo\b/i, href: "/habitaciones/umu", zona: "umu" },
  { pattern: /\bLa Merced\b/i, href: "/habitaciones/umu", zona: "umu" },
  { pattern: /\bCartagena\b/i, href: "/habitaciones/upct", zona: "upct" },
];

const NOMBRES_ZONA = { ucam: "UCAM", umu: "UMU", upct: "UPCT" } as const;

// Detecta la zona más mencionada en un bloque (h2 + contenido). Devuelve null
// si ninguna aparece — evita CTAs fuera de contexto.
export function detectarZona(texto: string): "ucam" | "umu" | "upct" | null {
  const contador: Record<"ucam" | "umu" | "upct", number> = { ucam: 0, umu: 0, upct: 0 };
  for (const rule of RULES) {
    const matches = texto.match(new RegExp(rule.pattern.source, "gi"));
    if (matches) contador[rule.zona] += matches.length;
  }
  const top = (Object.entries(contador) as ["ucam" | "umu" | "upct", number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

export function ctaZona(zona: "ucam" | "umu" | "upct") {
  return {
    href: `/habitaciones/${zona}`,
    label: `Ver habitaciones cerca de la ${NOMBRES_ZONA[zona]} →`,
  };
}

// CTA final según la intención del artículo: los de propietario/inversor van a
// la calculadora de rentabilidad (lead de más valor); el resto, al catálogo
// (inquilinos). Es la palanca de conversión principal del blog.
export type CtaIntencion = { href: string; label: string };

const PROPIETARIO_RE = /propietari|inversor|invertir|rentabilidad|rentar|vender|venta de|plusval|gestion(a|ar)? (tu |el )?alquiler|saca(r|le)? partido|alquilar tu piso/i;

export function ctaIntencion(texto: string): CtaIntencion {
  if (PROPIETARIO_RE.test(texto)) {
    return { href: "/rentabilidad", label: "Calcula cuánto renta tu piso con InterRoom Murcia →" };
  }
  return { href: "/catalogo", label: "Ver habitaciones disponibles en Murcia →" };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Devuelve HTML seguro: el texto base va escapado y solo insertamos anchors
// generados por nosotros. Cada regla se aplica una única vez por párrafo.
export function linkifyParrafo(texto: string): string {
  let html = escapeHtml(texto);
  const usados = new Set<number>();
  RULES.forEach((rule, idx) => {
    if (usados.has(idx)) return;
    const m = rule.pattern.exec(html);
    if (!m) return;
    const original = m[0];
    const anchor = `<a href="${rule.href}" class="article-inline-link">${original}</a>`;
    html = html.slice(0, m.index) + anchor + html.slice(m.index + original.length);
    usados.add(idx);
  });
  return html;
}
