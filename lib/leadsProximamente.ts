import { sql } from "@vercel/postgres";
import { telegramSendMessage } from "./telegram";

export type LeadProximamente = {
  id: number;
  piso_id: string;
  piso_titulo: string;
  piso_categoria: string;
  nombre: string;
  telefono: string;
  created_at: string;
  migrated_at?: string | null;
  migrated_lead_id?: number | null;
  contactado?: boolean;
  contactado_at?: string | null;
  piso_eliminado_at?: string | null;
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads_proximamente (
      id SERIAL PRIMARY KEY,
      piso_id TEXT NOT NULL,
      piso_titulo TEXT NOT NULL,
      piso_categoria TEXT NOT NULL DEFAULT 'alquiler',
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  // Columnas para rastrear la migración al pipeline normal (leads_propietarios).
  await sql`ALTER TABLE leads_proximamente ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;`;
  await sql`ALTER TABLE leads_proximamente ADD COLUMN IF NOT EXISTS migrated_lead_id INTEGER;`;
  // Gestión manual: marcar un lead como ya contactado por el equipo comercial.
  await sql`ALTER TABLE leads_proximamente ADD COLUMN IF NOT EXISTS contactado BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE leads_proximamente ADD COLUMN IF NOT EXISTS contactado_at TIMESTAMPTZ;`;
  // Marca de cuándo se eliminó el piso del catálogo (para borrar el lead a los 10 días).
  await sql`ALTER TABLE leads_proximamente ADD COLUMN IF NOT EXISTS piso_eliminado_at TIMESTAMPTZ;`;
}

export async function crearLeadProximamente(data: {
  piso_id: string;
  piso_titulo: string;
  piso_categoria: string;
  nombre: string;
  telefono: string;
}) {
  await ensureTable();
  const { rows } = await sql<{ id: number }>`
    INSERT INTO leads_proximamente (piso_id, piso_titulo, piso_categoria, nombre, telefono)
    VALUES (${data.piso_id}, ${data.piso_titulo}, ${data.piso_categoria}, ${data.nombre}, ${data.telefono})
    RETURNING id;
  `;
  const nuevoId = rows[0]?.id;
  console.log(`[leads-proximamente] guardado id=${nuevoId} piso=${data.piso_titulo} tel=${data.telefono}`);

  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (chatIds.length) {
    const tipo = data.piso_categoria === "compraventa" ? "Compraventa" : "Alquiler";
    const texto = [
      `🏗️ Interés en Próximamente (${tipo})`,
      `Propiedad: ${data.piso_titulo}`,
      `Nombre: ${data.nombre}`,
      `Teléfono: ${data.telefono}`,
    ].join("\n");
    await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch(() => {})));
  }
  return nuevoId;
}

// Devuelve todos los leads de próximamente SIN auto-borrar nada.
// Los contactados se mantienen (quedan marcados visualmente).
export async function listarLeadsProximamente(): Promise<LeadProximamente[]> {
  await ensureTable();
  const { rows } = await sql<LeadProximamente>`
    SELECT id, piso_id, piso_titulo, piso_categoria, nombre, telefono, created_at,
           migrated_at, migrated_lead_id, contactado, contactado_at, piso_eliminado_at
    FROM leads_proximamente
    ORDER BY contactado ASC, piso_titulo, created_at DESC;
  `;
  return rows;
}

export async function marcarLeadProximamenteContactado(id: number, contactado: boolean) {
  await ensureTable();
  await sql`
    UPDATE leads_proximamente
    SET contactado = ${contactado}, contactado_at = ${contactado ? new Date().toISOString() : null}
    WHERE id = ${id};
  `;
}

export async function eliminarLeadProximamente(id: number) {
  await ensureTable();
  await sql`DELETE FROM leads_proximamente WHERE id = ${id};`;
}

// Copia cruda de todos los registros. Pensada para backup.
export async function exportarLeadsProximamenteSinLimpiar(): Promise<LeadProximamente[]> {
  await ensureTable();
  const { rows } = await sql<LeadProximamente>`
    SELECT id, piso_id, piso_titulo, piso_categoria, nombre, telefono, created_at,
           migrated_at, migrated_lead_id, contactado, contactado_at
    FROM leads_proximamente
    ORDER BY created_at DESC;
  `;
  return rows;
}

// Mueve todos los leads de próximamente aún no migrados al pipeline normal
// (leads_propietarios), preservando el created_at original y mapeando los
// datos del piso al mensaje/dirección/tipo/sección del lead. Es idempotente:
// marca cada origen con migrated_at + migrated_lead_id para no duplicar si se
// vuelve a ejecutar.
export async function migrarLeadsProximamenteAPipeline(): Promise<{
  migrados: number;
  yaMigrados: number;
  errores: { id: number; error: string }[];
}> {
  await ensureTable();
  // Asegura que leads_propietarios existe con sus columnas opcionales.
  const { crearTablaLeadsPropietarios } = await import("./leads");
  await crearTablaLeadsPropietarios();

  const { rows: pendientes } = await sql<LeadProximamente>`
    SELECT id, piso_id, piso_titulo, piso_categoria, nombre, telefono, created_at
    FROM leads_proximamente
    WHERE migrated_at IS NULL
    ORDER BY created_at ASC;
  `;

  const { rows: yaMig } = await sql<{ c: number }>`
    SELECT count(*)::int AS c FROM leads_proximamente WHERE migrated_at IS NOT NULL;
  `;

  const errores: { id: number; error: string }[] = [];
  let migrados = 0;

  for (const p of pendientes) {
    try {
      const tipo = p.piso_categoria === "compraventa" ? "Compraventa" : "Alquiler";
      const seccion = p.piso_categoria === "compraventa" ? "venta" : "estudiantes";
      const direccion = p.piso_titulo;
      const mensaje = `Interés en PRÓXIMAMENTE (${tipo}) — ${p.piso_titulo} [piso_id ${p.piso_id}]`;
      const origen = "proximamente";

      const { rows } = await sql<{ id: number }>`
        INSERT INTO leads_propietarios (nombre, telefono, direccion, email, tipo, metros, precio_deseado, mensaje, origen, seccion, created_at)
        VALUES (${p.nombre}, ${p.telefono}, ${direccion}, ${null}, ${tipo}, ${null}, ${null}, ${mensaje}, ${origen}, ${seccion}, ${p.created_at})
        RETURNING id;
      `;
      const nuevoId = rows[0]?.id ?? null;

      await sql`
        UPDATE leads_proximamente
        SET migrated_at = now(), migrated_lead_id = ${nuevoId}
        WHERE id = ${p.id};
      `;
      migrados++;
    } catch (e) {
      errores.push({ id: p.id, error: e instanceof Error ? e.message : "Error" });
    }
  }

  return { migrados, yaMigrados: yaMig[0]?.c ?? 0, errores };
}
