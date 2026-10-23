import type { Contrato } from "./contratos";
import { getContrato } from "./contratos";
import { generarYSubirPdfSiProcede } from "./contratos-pdf";
import { enviarContratoFirmadoPropietario } from "./contratos-email";
import { telegramSendDocument, telegramSendMessage } from "./telegram";

/**
 * Orquesta lo que debe pasar DESPUÉS de una firma:
 *  - Si todavía faltan firmas → notifica a admin por Telegram quién
 *    ha firmado y qué falta.
 *  - Si ambas partes han firmado → genera el PDF, lo sube, lo envía
 *    por email al propietario y por Telegram al admin.
 *
 * Nunca lanza: los errores de PDF/email/Telegram no deben romper el
 * flujo de firma. Devuelve un resumen de lo que ha ido bien o mal.
 */
export async function tramitarPostFirma(contratoId: string): Promise<{
  pdfGenerado: boolean;
  emailOk: boolean;
  telegramOk: boolean;
  errores: string[];
}> {
  const errores: string[] = [];
  let pdfGenerado = false;
  let emailOk = false;
  let telegramOk = false;

  const contrato = await getContrato(contratoId);
  if (!contrato) return { pdfGenerado, emailOk, telegramOk, errores: ["contrato no encontrado"] };

  // Si todavía falta alguna firma: aviso al admin con el estado.
  if (contrato.estado !== "firmado") {
    telegramOk = await notificarAdminFirmaParcial(contrato).catch((e) => {
      errores.push(`telegram parcial: ${e?.message ?? e}`);
      return false;
    });
    return { pdfGenerado, emailOk, telegramOk, errores };
  }

  // Ambas firmadas: PDF.
  let pdf: Buffer | null = null;
  try {
    const bytes = await generarYSubirPdfSiProcede(contratoId);
    if (bytes) {
      pdf = bytes;
      pdfGenerado = true;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[postfirma] PDF generation failed:", e);
    errores.push(`pdf: ${msg}`);
  }

  // Email al propietario SIEMPRE (con PDF si lo tenemos, sin él si no).
  // Que falle el PDF no debe impedir que el cliente reciba el aviso.
  const r = await enviarContratoFirmadoPropietario(contrato, pdf);
  emailOk = r.ok;
  if (!r.ok && r.error) {
    console.error("[postfirma] email failed:", r.error);
    errores.push(`email: ${r.error}`);
  }

  // Telegram al admin con el PDF si lo tenemos; si no, mensaje de aviso.
  if (pdf) {
    telegramOk = await enviarPdfATelegramAdmin(contrato, pdf).catch((e) => {
      errores.push(`telegram pdf: ${e?.message ?? e}`);
      return false;
    });
  } else {
    telegramOk = await notificarAdminFirmaCompletaSinPdf(contrato).catch((e) => {
      errores.push(`telegram sin-pdf: ${e?.message ?? e}`);
      return false;
    });
  }

  return { pdfGenerado, emailOk, telegramOk, errores };
}

function tipoLabel(contrato: Contrato): string {
  return contrato.tipo === "gestion_alquiler"
    ? "gestión de alquiler"
    : "exclusiva";
}

function filenameBase(contrato: Contrato): string {
  return contrato.tipo === "gestion_alquiler"
    ? "contrato-gestion-alquiler"
    : "contrato-exclusiva";
}

function cifra(contrato: Contrato): string {
  if (contrato.tipo === "gestion_alquiler") {
    const d = contrato.datos as import("./contratos").DatosContratoGestion;
    const renta = d.renta_mensual
      ? `${d.renta_mensual.toLocaleString("es-ES")} €/mes`
      : "sin renta indicada";
    const com =
      d.modelo_comision === "manual"
        ? d.comision_texto || `${d.comision_pct}% + IVA`
        : `${d.modelo_comision === "mensual_15" ? 15 : 10}% + IVA / mes`;
    return `Renta: ${renta}\nComisión: ${com}`;
  }
  const d = contrato.datos as import("./contratos").DatosContratoExclusiva;
  const precio = d.precio_venta
    ? `${d.precio_venta.toLocaleString("es-ES")} €`
    : "sin precio";
  return `Precio: ${precio}\nComisión: ${d.comision_pct}%`;
}

async function notificarAdminFirmaCompletaSinPdf(contrato: Contrato): Promise<boolean> {
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chatIds.length) return false;
  const nombre = contrato.datos.propietario?.nombre || "sin nombre";
  const inmueble = contrato.datos.inmueble?.direccion || "sin dirección";
  const msg = `✅ Contrato de ${tipoLabel(contrato)} FIRMADO por ambas partes.

Cliente: ${nombre}
Inmueble: ${inmueble}

⚠️ El PDF no se pudo generar en este momento. Entra al panel admin para reintentar la descarga: /admin/documentos/contratos/${contrato.id}`;
  await Promise.all(chatIds.map((id) => telegramSendMessage(id, msg).catch(() => undefined)));
  return true;
}

async function notificarAdminFirmaParcial(contrato: Contrato): Promise<boolean> {
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chatIds.length) return false;

  const quien = contrato.estado === "firmado_propietario" ? "✍️ El propietario" : "✍️ La agencia";
  const falta = contrato.estado === "firmado_propietario" ? "La Agencia" : "El Propietario";
  const nombre = contrato.datos.propietario?.nombre || "sin nombre";
  const inmueble = contrato.datos.inmueble?.direccion || "sin dirección";
  const msg = `${quien} ha firmado el contrato de ${tipoLabel(contrato)}.

Cliente: ${nombre}
Inmueble: ${inmueble}

Falta por firmar: ${falta}.`;

  await Promise.all(chatIds.map((id) => telegramSendMessage(id, msg).catch(() => undefined)));
  return true;
}

async function enviarPdfATelegramAdmin(contrato: Contrato, pdf: Buffer): Promise<boolean> {
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!chatIds.length) return false;

  const nombre = contrato.datos.propietario?.nombre || "sin nombre";
  const inmueble = contrato.datos.inmueble?.direccion || "sin dirección";
  const caption = `✅ Contrato de ${tipoLabel(contrato)} FIRMADO por ambas partes.

Cliente: ${nombre}
Inmueble: ${inmueble}
${cifra(contrato)}`;

  const filename = `${filenameBase(contrato)}-${contrato.id.slice(0, 8)}.pdf`;
  await Promise.all(
    chatIds.map((id) =>
      telegramSendDocument(id, pdf, filename, caption).catch(() => undefined),
    ),
  );
  return true;
}
