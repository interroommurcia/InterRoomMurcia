import { sql } from "@vercel/postgres";
import { telegramSendMessage } from "./telegram";

export type TipoInteres = "individual" | "grupo";

export type LeadAlquiler = {
  id: number;
  piso_id: string;
  piso_titulo: string;
  piso_categoria: string;
  nombre: string;
  telefono: string;
  tipo_interes: TipoInteres;
  grupo_tam: number | null;
  mensaje: string | null;
  created_at: string;
  contactado?: boolean;
  contactado_at?: string | null;
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads_alquiler (
      id SERIAL PRIMARY KEY,
      piso_id TEXT NOT NULL,
      piso_titulo TEXT NOT NULL,
      piso_categoria TEXT NOT NULL DEFAULT 'alquiler',
      nombre TEXT NOT NULL DEFAULT '',
      telefono TEXT NOT NULL,
      tipo_interes TEXT NOT NULL DEFAULT 'individual',
      grupo_tam INTEGER,
      mensaje TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      contactado BOOLEAN NOT NULL DEFAULT false,
      contactado_at TIMESTAMPTZ
    );
  `;
}

export async function crearLeadAlquiler(data: {
  piso_id: string;
  piso_titulo: string;
  piso_categoria: string;
  nombre: string;
  telefono: string;
  tipo_interes: TipoInteres;
  grupo_tam: number | null;
  mensaje: string | null;
}) {
  await ensureTable();
  const { rows } = await sql<{ id: number }>`
    INSERT INTO leads_alquiler (piso_id, piso_titulo, piso_categoria, nombre, telefono, tipo_interes, grupo_tam, mensaje)
    VALUES (${data.piso_id}, ${data.piso_titulo}, ${data.piso_categoria}, ${data.nombre}, ${data.telefono}, ${data.tipo_interes}, ${data.grupo_tam}, ${data.mensaje})
    RETURNING id;
  `;
  const nuevoId = rows[0]?.id;
  console.log(`[leads-alquiler] guardado id=${nuevoId} piso=${data.piso_titulo} tel=${data.telefono} tipo=${data.tipo_interes}`);

  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (chatIds.length) {
    const esGrupo = data.tipo_interes === "grupo";
    const titulo = esGrupo
      ? `🔥 GRUPO interesado en alquilar${data.grupo_tam ? ` (${data.grupo_tam} personas)` : ""}`
      : `🏠 Interés en alquilar (individual)`;
    const texto = [
      titulo,
      `Propiedad: ${data.piso_titulo}`,
      `Nombre: ${data.nombre || "—"}`,
      `Teléfono: ${data.telefono}`,
      data.mensaje ? `Mensaje: ${data.mensaje}` : null,
    ].filter(Boolean).join("\n");
    await Promise.all(chatIds.map((id) => telegramSendMessage(id, texto).catch(() => {})));
  }
  return nuevoId;
}

export async function listarLeadsAlquiler(): Promise<LeadAlquiler[]> {
  await ensureTable();
  const { rows } = await sql<LeadAlquiler>`
    SELECT id, piso_id, piso_titulo, piso_categoria, nombre, telefono, tipo_interes, grupo_tam, mensaje,
           created_at, contactado, contactado_at
    FROM leads_alquiler
    ORDER BY contactado ASC, (tipo_interes = 'grupo') DESC, created_at DESC;
  `;
  return rows;
}

export async function marcarLeadAlquilerContactado(id: number, contactado: boolean) {
  await ensureTable();
  await sql`
    UPDATE leads_alquiler
    SET contactado = ${contactado}, contactado_at = ${contactado ? new Date().toISOString() : null}
    WHERE id = ${id};
  `;
}

export async function eliminarLeadAlquiler(id: number) {
  await ensureTable();
  await sql`DELETE FROM leads_alquiler WHERE id = ${id};`;
}
