import { sql } from "@vercel/postgres";
import { listarLeadsProximamente } from "./leadsProximamente";
import { listarLeadsAlquiler } from "./leadsAlquiler";
import { getPisos, type EstadoPiso } from "./pisos";

export const DIAS_BORRADO_TRAS_ELIMINAR = 10;

export type LeadCasa = {
  id: number;
  fuente: "proximamente" | "alquiler"; // de qué formulario vino
  piso_id: string;
  nombre: string;
  telefono: string;
  tipo_interes: "individual" | "grupo" | null;
  grupo_tam: number | null;
  mensaje: string | null;
  created_at: string;
  contactado: boolean;
  piso_eliminado_at: string | null;
};

export type GrupoCasa = {
  piso_id: string;
  piso_titulo: string;
  // Estado ACTUAL del piso en el catálogo; "eliminado" si ya no existe.
  estado: EstadoPiso | "eliminado";
  piso_eliminado_at: string | null;
  diasParaBorrado: number | null; // solo si está eliminado
  leads: LeadCasa[];
};

// Marca los leads de un piso como "piso eliminado" (para borrarlos a los N días).
export async function marcarLeadsPisoEliminado(pisoId: string): Promise<void> {
  await Promise.all([
    sql`UPDATE leads_proximamente SET piso_eliminado_at = now() WHERE piso_id = ${pisoId} AND piso_eliminado_at IS NULL;`,
    sql`UPDATE leads_alquiler SET piso_eliminado_at = now() WHERE piso_id = ${pisoId} AND piso_eliminado_at IS NULL;`,
  ]);
}

// Si un piso vuelve a existir con el mismo id, se reactivan sus leads.
export async function reactivarLeadsPiso(pisoId: string): Promise<void> {
  await Promise.all([
    sql`UPDATE leads_proximamente SET piso_eliminado_at = NULL WHERE piso_id = ${pisoId} AND piso_eliminado_at IS NOT NULL;`,
    sql`UPDATE leads_alquiler SET piso_eliminado_at = NULL WHERE piso_id = ${pisoId} AND piso_eliminado_at IS NOT NULL;`,
  ]);
}

// Borra los leads cuyo piso se eliminó hace más de N días.
export async function limpiarLeadsCaducados(dias = DIAS_BORRADO_TRAS_ELIMINAR): Promise<{ proximamente: number; alquiler: number }> {
  const corte = new Date();
  corte.setDate(corte.getDate() - dias);
  const iso = corte.toISOString();
  const [p, a] = await Promise.all([
    sql`DELETE FROM leads_proximamente WHERE piso_eliminado_at IS NOT NULL AND piso_eliminado_at < ${iso} RETURNING id;`,
    sql`DELETE FROM leads_alquiler WHERE piso_eliminado_at IS NOT NULL AND piso_eliminado_at < ${iso} RETURNING id;`,
  ]);
  return { proximamente: p.rowCount ?? 0, alquiler: a.rowCount ?? 0 };
}

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Lista unificada de leads (próximamente + disponible/alquiler) agrupada por
// casa, con el ESTADO ACTUAL del piso (vinculado por piso_id, así que si la casa
// pasa de próximamente a disponible el estado cambia solo).
export async function listarLeadsCasas(): Promise<GrupoCasa[]> {
  const [prox, alq, pisos] = await Promise.all([
    listarLeadsProximamente(),
    listarLeadsAlquiler(),
    getPisos().catch(() => []),
  ]);

  const pisoPorId = new Map(pisos.map((p) => [p.id, p]));

  const todos: LeadCasa[] = [
    ...prox.map((l) => ({
      id: l.id,
      fuente: "proximamente" as const,
      piso_id: l.piso_id,
      nombre: l.nombre,
      telefono: l.telefono,
      tipo_interes: null,
      grupo_tam: null,
      mensaje: null,
      created_at: l.created_at,
      contactado: !!l.contactado,
      piso_eliminado_at: l.piso_eliminado_at ?? null,
    })),
    ...alq.map((l) => ({
      id: l.id,
      fuente: "alquiler" as const,
      piso_id: l.piso_id,
      nombre: l.nombre,
      telefono: l.telefono,
      tipo_interes: (l.tipo_interes ?? "individual") as "individual" | "grupo",
      grupo_tam: l.grupo_tam ?? null,
      mensaje: l.mensaje ?? null,
      created_at: l.created_at,
      contactado: !!l.contactado,
      piso_eliminado_at: l.piso_eliminado_at ?? null,
    })),
  ];

  const grupos = new Map<string, GrupoCasa>();
  for (const lead of todos) {
    let g = grupos.get(lead.piso_id);
    if (!g) {
      const piso = pisoPorId.get(lead.piso_id);
      const estado: EstadoPiso | "eliminado" = piso ? piso.estado : "eliminado";
      const dEl = diasDesde(lead.piso_eliminado_at);
      g = {
        piso_id: lead.piso_id,
        piso_titulo: piso?.titulo || buscarTitulo(lead.piso_id, prox, alq) || "(casa eliminada)",
        estado,
        piso_eliminado_at: lead.piso_eliminado_at,
        diasParaBorrado: estado === "eliminado" && dEl != null ? Math.max(0, DIAS_BORRADO_TRAS_ELIMINAR - dEl) : null,
        leads: [],
      };
      grupos.set(lead.piso_id, g);
    }
    g.leads.push(lead);
  }

  // Orden: primero los que tienen leads sin contactar, luego por fecha más reciente.
  return Array.from(grupos.values()).sort((a, b) => {
    const pa = a.leads.some((l) => !l.contactado) ? 0 : 1;
    const pb = b.leads.some((l) => !l.contactado) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const fa = Math.max(...a.leads.map((l) => new Date(l.created_at).getTime()));
    const fb = Math.max(...b.leads.map((l) => new Date(l.created_at).getTime()));
    return fb - fa;
  });
}

function buscarTitulo(
  pisoId: string,
  prox: { piso_id: string; piso_titulo: string }[],
  alq: { piso_id: string; piso_titulo: string }[]
): string | null {
  return prox.find((l) => l.piso_id === pisoId)?.piso_titulo || alq.find((l) => l.piso_id === pisoId)?.piso_titulo || null;
}
