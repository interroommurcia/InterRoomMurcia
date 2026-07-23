import { sql } from "@vercel/postgres";

export type Lead = {
  id: number;
  nombre: string;
  telefono: string;
  email: string | null;
  direccion: string;
  tipo: string | null;
  metros: number | null;
  precio_deseado: number | null;
  mensaje: string | null;
  origen: string | null;
  created_at: string;
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads_propietarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      direccion TEXT NOT NULL,
      mensaje TEXT,
      origen TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  // Compatibilidad con tablas creadas antes de añadir estas columnas.
  await sql`ALTER TABLE leads_propietarios ADD COLUMN IF NOT EXISTS origen TEXT;`;
  await sql`ALTER TABLE leads_propietarios ADD COLUMN IF NOT EXISTS email TEXT;`;
  await sql`ALTER TABLE leads_propietarios ADD COLUMN IF NOT EXISTS tipo TEXT;`;
  await sql`ALTER TABLE leads_propietarios ADD COLUMN IF NOT EXISTS metros INTEGER;`;
  await sql`ALTER TABLE leads_propietarios ADD COLUMN IF NOT EXISTS precio_deseado INTEGER;`;
}

export async function crearLead(data: {
  nombre: string;
  telefono: string;
  direccion: string;
  email?: string;
  tipo?: string;
  metros?: number;
  precio_deseado?: number;
  mensaje?: string;
  origen?: string;
}) {
  await ensureTable();
  await sql`
    INSERT INTO leads_propietarios (nombre, telefono, direccion, email, tipo, metros, precio_deseado, mensaje, origen)
    VALUES (${data.nombre}, ${data.telefono}, ${data.direccion}, ${data.email || null}, ${data.tipo || null}, ${data.metros ?? null}, ${data.precio_deseado ?? null}, ${data.mensaje || null}, ${data.origen || null});
  `;
}

export async function listarLeads(): Promise<Lead[]> {
  await ensureTable();
  const { rows } = await sql<Lead>`
    SELECT id, nombre, telefono, email, direccion, tipo, metros, precio_deseado, mensaje, origen, created_at
    FROM leads_propietarios
    ORDER BY created_at DESC;
  `;
  return rows;
}

export async function leadsStats(): Promise<{
  total7d: number;
  total30d: number;
  byOrigen: { origen: string; count: number }[];
}> {
  await ensureTable();
  const { rows: r7 } = await sql`
    SELECT count(*)::int AS c FROM leads_propietarios WHERE created_at >= now() - interval '7 days';
  `;
  const { rows: r30 } = await sql`
    SELECT count(*)::int AS c FROM leads_propietarios WHERE created_at >= now() - interval '30 days';
  `;
  const { rows: byOrigen } = await sql`
    SELECT coalesce(nullif(trim(origen), ''), 'Directo / sin referencia') AS origen, count(*)::int AS c
    FROM leads_propietarios
    WHERE created_at >= now() - interval '30 days'
    GROUP BY origen ORDER BY c DESC LIMIT 15;
  `;
  return {
    total7d: (r7[0]?.c as number) ?? 0,
    total30d: (r30[0]?.c as number) ?? 0,
    byOrigen: byOrigen.map((r) => ({ origen: r.origen as string, count: r.c as number })),
  };
}
