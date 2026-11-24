import { sql } from "@vercel/postgres";
import { telegramSendMessage } from "./telegram";

export type TipoLead = "estudiante" | "propietario";

export type LeadComercial = {
  id: number;
  tipo: TipoLead;
  nombre: string;
  email: string | null;
  telefono: string | null;
  consentimiento: boolean;
  origen: string;
  mensaje: string | null;
  created_at: string;
  contactado: boolean;
  contactado_at: string | null;
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads_comerciales (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL DEFAULT 'estudiante',
      nombre TEXT NOT NULL DEFAULT '',
      email TEXT,
      telefono TEXT,
      consentimiento BOOLEAN NOT NULL DEFAULT false,
      origen TEXT NOT NULL DEFAULT 'web',
      mensaje TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      contactado BOOLEAN NOT NULL DEFAULT false,
      contactado_at TIMESTAMPTZ
    );
  `;
  // Evita duplicados exactos de contacto por tipo (no rompe si ya existe).
  await sql`CREATE INDEX IF NOT EXISTS leads_comerciales_created_idx ON leads_comerciales (created_at DESC);`;
  await sql`CREATE INDEX IF NOT EXISTS leads_comerciales_tipo_idx ON leads_comerciales (tipo);`;
}

export async function crearLeadComercial(data: {
  tipo: TipoLead;
  nombre: string;
  email: string | null;
  telefono: string | null;
  consentimiento: boolean;
  origen: string;
  mensaje: string | null;
}) {
  await ensureTable();

  // Deduplica: si el mismo email o teléfono ya está registrado para ese tipo,
  // actualiza en lugar de crear otra fila (evita listas sucias para el envío en masa).
  if (data.email || data.telefono) {
    const { rows: existentes } = await sql<{ id: number }>`
      SELECT id FROM leads_comerciales
      WHERE tipo = ${data.tipo}
        AND (
          (${data.email}::text IS NOT NULL AND email = ${data.email})
          OR (${data.telefono}::text IS NOT NULL AND telefono = ${data.telefono})
        )
      LIMIT 1;
    `;
    if (existentes[0]?.id) {
      await sql`
        UPDATE leads_comerciales
        SET nombre = COALESCE(NULLIF(${data.nombre}, ''), nombre),
            email = COALESCE(${data.email}, email),
            telefono = COALESCE(${data.telefono}, telefono),
            consentimiento = ${data.consentimiento},
            mensaje = COALESCE(${data.mensaje}, mensaje)
        WHERE id = ${existentes[0].id};
      `;
      return existentes[0].id;
    }
  }

  const { rows } = await sql<{ id: number }>`
    INSERT INTO leads_comerciales (tipo, nombre, email, telefono, consentimiento, origen, mensaje)
    VALUES (${data.tipo}, ${data.nombre}, ${data.email}, ${data.telefono}, ${data.consentimiento}, ${data.origen}, ${data.mensaje})
    RETURNING id;
  `;
  const nuevoId = rows[0]?.id;
  console.log(`[leads-comerciales] guardado id=${nuevoId} tipo=${data.tipo} email=${data.email ?? "—"} tel=${data.telefono ?? "—"}`);

  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (chatIds.length) {
    const texto = [
      `📋 Nuevo registro en la lista (${data.tipo})`,
      `Nombre: ${data.nombre || "—"}`,
      `Email: ${data.email ?? "—"}`,
      `Teléfono: ${data.telefono ?? "—"}`,
      `Origen: ${data.origen}`,
      data.mensaje ? `Mensaje: ${data.mensaje}` : null,
    ].filter(Boolean).join("\n");
    await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch(() => {})));
  }
  return nuevoId;
}

export async function listarLeadsComerciales(): Promise<LeadComercial[]> {
  await ensureTable();
  const { rows } = await sql<LeadComercial>`
    SELECT id, tipo, nombre, email, telefono, consentimiento, origen, mensaje,
           created_at, contactado, contactado_at
    FROM leads_comerciales
    ORDER BY created_at DESC;
  `;
  return rows;
}
