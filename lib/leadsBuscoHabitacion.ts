import { sql } from "@vercel/postgres";
import { telegramSendMessage } from "./telegram";

// "Busco Habitación": estudiantes que dejan su contacto para que les avisemos
// cuando quede una habitación libre (demanda general, no una vivienda concreta).

export type LeadBuscoHabitacion = {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  mensaje: string | null;
  consentimiento: boolean;
  origen: string;
  created_at: string;
  contactado: boolean;
  contactado_at: string | null;
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads_busco_habitacion (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL DEFAULT '',
      email TEXT,
      telefono TEXT,
      mensaje TEXT,
      consentimiento BOOLEAN NOT NULL DEFAULT false,
      origen TEXT NOT NULL DEFAULT 'web',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      contactado BOOLEAN NOT NULL DEFAULT false,
      contactado_at TIMESTAMPTZ
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS leads_busco_habitacion_created_idx ON leads_busco_habitacion (created_at DESC);`;
}

export async function crearLeadBuscoHabitacion(data: {
  nombre: string;
  email: string | null;
  telefono: string | null;
  mensaje: string | null;
  consentimiento: boolean;
  origen: string;
}) {
  await ensureTable();

  // Deduplica por email o teléfono: si ya se apuntó, actualiza en vez de duplicar.
  if (data.email || data.telefono) {
    const { rows: existentes } = await sql<{ id: number }>`
      SELECT id FROM leads_busco_habitacion
      WHERE (${data.email}::text IS NOT NULL AND email = ${data.email})
         OR (${data.telefono}::text IS NOT NULL AND telefono = ${data.telefono})
      LIMIT 1;
    `;
    if (existentes[0]?.id) {
      await sql`
        UPDATE leads_busco_habitacion
        SET nombre = COALESCE(NULLIF(${data.nombre}, ''), nombre),
            email = COALESCE(${data.email}, email),
            telefono = COALESCE(${data.telefono}, telefono),
            mensaje = COALESCE(${data.mensaje}, mensaje),
            consentimiento = ${data.consentimiento}
        WHERE id = ${existentes[0].id};
      `;
      return existentes[0].id;
    }
  }

  const { rows } = await sql<{ id: number }>`
    INSERT INTO leads_busco_habitacion (nombre, email, telefono, mensaje, consentimiento, origen)
    VALUES (${data.nombre}, ${data.email}, ${data.telefono}, ${data.mensaje}, ${data.consentimiento}, ${data.origen})
    RETURNING id;
  `;
  const nuevoId = rows[0]?.id;
  console.log(`[busco-habitacion] guardado id=${nuevoId} email=${data.email ?? "—"} tel=${data.telefono ?? "—"} origen=${data.origen}`);

  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (chatIds.length) {
    const texto = [
      "🎓 Busco habitación (estudiante)",
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

export async function listarLeadsBuscoHabitacion(): Promise<LeadBuscoHabitacion[]> {
  await ensureTable();
  const { rows } = await sql<LeadBuscoHabitacion>`
    SELECT id, nombre, email, telefono, mensaje, consentimiento, origen,
           created_at, contactado, contactado_at
    FROM leads_busco_habitacion
    ORDER BY created_at DESC;
  `;
  return rows;
}
