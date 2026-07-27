// Post-procesado de contenido de artículos: convierte menciones de zonas y
// universidades en enlaces internos hacia sus páginas correspondientes. Solo
// enlaza la primera aparición de cada término por párrafo para no saturar.

type Rule = { pattern: RegExp; href: string };

const RULES: Rule[] = [
  { pattern: /\bUCAM\b/i, href: "/habitaciones/ucam" },
  { pattern: /\bUMU\b/i, href: "/habitaciones/umu" },
  { pattern: /\bUPCT\b/i, href: "/habitaciones/upct" },
  { pattern: /\bUniversidad Cat[oó]lica( de Murcia)?\b/i, href: "/habitaciones/ucam" },
  { pattern: /\bUniversidad de Murcia\b/i, href: "/habitaciones/umu" },
  { pattern: /\bUniversidad Polit[eé]cnica( de Cartagena)?\b/i, href: "/habitaciones/upct" },
  { pattern: /\bGuadalupe\b/i, href: "/habitaciones/ucam" },
  { pattern: /\bLa Ñora\b/i, href: "/habitaciones/ucam" },
  { pattern: /\bEspinardo\b/i, href: "/habitaciones/umu" },
  { pattern: /\bLa Merced\b/i, href: "/habitaciones/umu" },
  { pattern: /\bCartagena\b/i, href: "/habitaciones/upct" },
];

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
