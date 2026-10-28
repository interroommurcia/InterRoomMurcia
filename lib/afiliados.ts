// Recursos recomendados del blog: mezcla de enlaces INTERNOS (propios, 100%
// monetizables ya) y de AFILIADO (hay que darse de alta en cada programa y
// pegar aquí el enlace con tu ID). Mientras `url` sea null, el recurso no se
// muestra: así el bloque solo enseña enlaces reales que funcionan.
//
// Para activar un afiliado: date de alta en el programa, copia tu enlace de
// afiliado y pégalo en `url`. Nada más. Ejemplos de programas en España:
//   - Amazon Afiliados (muebles, menaje, deco) → amazon.es/associates
//   - Seguros de impago/hogar (p.ej. a través de redes como Awin/TradeDoubler)
//   - Mudanzas / trasteros, fibra+móvil, cuenta bancaria para estudiantes
//
// `tipo`: "interno" = nuestro, enlace normal, dofollow.
//         "afiliado" = externo monetizado, se marca y se pone rel sponsored.

export type Recurso = {
  id: string;
  titulo: string;
  descripcion: string;
  cta: string;
  url: string | null;
  tipo: "interno" | "afiliado";
  // Solo se muestra en artículos cuyo texto encaje con alguno de estos temas.
  // Vacío = se puede mostrar en cualquier artículo.
  temas?: ("inquilino" | "propietario" | "mudanza")[];
};

export const RECURSOS: Recurso[] = [
  {
    id: "comparador-luz",
    titulo: "Compara tu factura de la luz",
    descripcion: "Al mudarte, ahorra en tu tarifa eléctrica en 2 minutos con nuestro comparador.",
    cta: "Comparar tarifas",
    url: "/comparador-luz",
    tipo: "interno",
    temas: ["inquilino", "mudanza"],
  },
  {
    id: "catalogo",
    titulo: "Habitaciones disponibles en Murcia",
    descripcion: "Mira la disponibilidad real cerca de tu universidad y reserva visita.",
    cta: "Ver catálogo",
    url: "/catalogo",
    tipo: "interno",
    temas: ["inquilino"],
  },
  {
    id: "rentabilidad",
    titulo: "¿Cuánto renta tu piso?",
    descripcion: "Simula la rentabilidad de tu vivienda con la gestión de InterRoom Murcia.",
    cta: "Calcular rentabilidad",
    url: "/rentabilidad",
    tipo: "interno",
    temas: ["propietario"],
  },
  // --- AFILIADOS: pega aquí tu enlace de afiliado para activarlos ---
  {
    id: "seguro-impago",
    titulo: "Seguro de impago de alquiler",
    descripcion: "Protege tu renta frente a impagos y desperfectos del inquilino.",
    cta: "Ver seguro",
    url: null, // ← pega tu enlace de afiliado
    tipo: "afiliado",
    temas: ["propietario"],
  },
  {
    id: "seguro-hogar",
    titulo: "Seguro de hogar para estudiantes",
    descripcion: "Cobertura básica para tu habitación o piso compartido desde pocos euros al mes.",
    cta: "Ver seguro",
    url: null, // ← pega tu enlace de afiliado
    tipo: "afiliado",
    temas: ["inquilino"],
  },
  {
    id: "muebles",
    titulo: "Lo básico para tu habitación",
    descripcion: "Escritorio, lámpara y organización para empezar el curso cómodo.",
    cta: "Ver en Amazon",
    url: null, // ← pega tu enlace de afiliado de Amazon
    tipo: "afiliado",
    temas: ["inquilino", "mudanza"],
  },
  {
    id: "fibra-movil",
    titulo: "Fibra y móvil para tu piso",
    descripcion: "Compara ofertas de internet para el piso compartido.",
    cta: "Ver ofertas",
    url: null, // ← pega tu enlace de afiliado
    tipo: "afiliado",
    temas: ["inquilino", "mudanza"],
  },
  {
    id: "mudanza",
    titulo: "Mudanza y trastero",
    descripcion: "Presupuesto de mudanza o guardamuebles para el cambio de curso.",
    cta: "Pedir presupuesto",
    url: null, // ← pega tu enlace de afiliado
    tipo: "afiliado",
    temas: ["mudanza"],
  },
];

export function temaDelArticulo(texto: string): "inquilino" | "propietario" | "mudanza" {
  if (/propietari|inversor|invertir|rentabilidad|rentar|vender|gestion/i.test(texto)) return "propietario";
  if (/mudanz|mudar|traslad|cambio de curso|primer d[ií]a|instalart/i.test(texto)) return "mudanza";
  return "inquilino";
}

// Recursos a mostrar en un artículo: solo con url real y que encajen con el
// tema (los sin `temas` valen para cualquiera). Máximo `max`.
export function recursosParaArticulo(texto: string, max = 4): Recurso[] {
  const tema = temaDelArticulo(texto);
  const activos = RECURSOS.filter((r) => r.url);
  const encajan = activos.filter((r) => !r.temas || r.temas.includes(tema));
  // Si quedan huecos, completa con otros activos (p.ej. internos genéricos).
  const resto = activos.filter((r) => !encajan.includes(r));
  return [...encajan, ...resto].slice(0, max);
}
