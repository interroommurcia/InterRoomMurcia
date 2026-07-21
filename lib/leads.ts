import { sql } from "@vercel/postgres";

export type Lead = {
  id: number;
  nombre: string;
  telefono: string;
  direccion: string;
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
  // Compatibilidad con tablas creadas antes de añadir la columna origen.
  await sql`ALTER TABLE leads_propietarios ADD COLUMN IF NOT EXISTS origen TEXT;`;
}

export async function crearLead(data: {
  nombre: string;
  telefono: string;
  direccion: string;
  mensaje?: string;
  origen?: string;
}) {
  await ensureTable();
  await sql`
    INSERT INTO leads_propietarios (nombre, telefono, direccion, mensaje, origen)
    VALUES (${data.nombre}, ${data.telefono}, ${data.direccion}, ${data.mensaje || null}, ${data.origen || null});
  `;
}

export async function listarLeads(): Promise<Lead[]> {
  await ensureTable();
  const { rows } = await sql<Lead>`
    SELECT id, nombre, telefono, direccion, mensaje, origen, created_at
    FROM leads_propietarios
    ORDER BY created_at DESC;
  `;
  return rows;
}
