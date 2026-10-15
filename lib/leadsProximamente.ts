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
}

export async function crearLeadProximamente(data: {
  piso_id: string;
  piso_titulo: string;
  piso_categoria: string;
  nombre: string;
  telefono: string;
}) {
  await ensureTable();
  await sql`
    INSERT INTO leads_proximamente (piso_id, piso_titulo, piso_categoria, nombre, telefono)
    VALUES (${data.piso_id}, ${data.piso_titulo}, ${data.piso_categoria}, ${data.nombre}, ${data.telefono});
  `;

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
}

export async function listarLeadsProximamente(): Promise<LeadProximamente[]> {
  await ensureTable();
  await limpiarLeadsExpirados();
  const { rows } = await sql<LeadProximamente>`
    SELECT id, piso_id, piso_titulo, piso_categoria, nombre, telefono, created_at
    FROM leads_proximamente
    ORDER BY piso_titulo, created_at DESC;
  `;
  return rows;
}

async function limpiarLeadsExpirados() {
  await sql`
    DELETE FROM leads_proximamente
    WHERE piso_id NOT IN (
      SELECT id::text FROM pisos WHERE estado = 'proximamente'
    )
    AND created_at < now() - interval '15 days';
  `;
}
