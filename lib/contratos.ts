import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

// ---------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------

export type TipoContrato = "exclusiva_venta" | "gestion_alquiler";

export type EstadoContrato =
  | "borrador"
  | "pendiente_firmas"
  | "firmado_propietario"
  | "firmado_agencia"
  | "firmado"
  | "cancelado";

export type DatosPropietario = {
  nombre: string;
  dni: string;
  direccion: string;
  telefono?: string;
  email?: string;
};

export type DatosInmueble = {
  direccion: string;
  referencia_catastral?: string;
  datos_registrales?: string;
  superficie?: string;
  cargas?: string;
  estado_arrendaticio?: string;
};

export type DatosAgencia = {
  nombre: string;
  cif: string;
  direccion: string;
  representante: string;
};

export type DatosContratoExclusiva = {
  propietario: DatosPropietario;
  inmueble: DatosInmueble;
  precio_venta: number;
  duracion_meses: number;
  comision_pct: number;
  penalizacion_pct: number;
  agencia: DatosAgencia;
};

// Dos modelos preestablecidos + "manual" para texto libre.
export type ModeloComisionGestion = "mensual_10" | "mensual_15" | "manual";

export type ServiciosGestion = {
  marketing: boolean;
  scoring: boolean;
  redaccion_arrendamiento: boolean;
  cobro_mensual: boolean;
};

export type ModalidadAlquiler = "tradicional" | "habitaciones";

export type DatosContratoGestion = {
  propietario: DatosPropietario;
  inmueble: DatosInmueble;
  modalidad_alquiler: ModalidadAlquiler;
  renta_mensual: number;       // Renta de referencia (vivienda completa) o ingreso estimado al 100% ocupación (por habitaciones).
  modelo_comision: ModeloComisionGestion;
  comision_pct: number;        // 10 o 15, o lo que teclee el admin en manual.
  comision_texto: string;      // Texto libre para "manual" (p.e. "una mensualidad al alta + 8% + IVA").
  duracion_meses: number;      // Por defecto 3.
  servicios: ServiciosGestion;
  agencia: DatosAgencia;
};

// Union usada en los flujos (render, PDF, email, Telegram) con narrowing por `tipo`.
export type DatosContrato = DatosContratoExclusiva | DatosContratoGestion;

export type Firma = {
  mode: "draw" | "electronic";
  dataUrl?: string;
  nombre_tipeado?: string;
  nombre: string;
  dni: string;
  ts: string;
  ip?: string | null;
};

export type Contrato = {
  id: string;
  tipo: TipoContrato;
  cliente_id: string | null;
  datos: DatosContrato;
  estado: EstadoContrato;
  signing_token: string | null;
  firma_propietario: Firma | null;
  firma_agencia: Firma | null;
  pdf_storage_path: string | null;
  firmado_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------
// Datos por defecto de la agencia (snapshot editable en el form)
// ---------------------------------------------------------------

export const AGENCIA_DEFAULT: DatosAgencia = {
  nombre: "InterRoom Murcia",
  cif: "",
  direccion: "Murcia",
  representante: "",
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function generarToken(): string {
  // 32 bytes → 43 chars base64url, suficiente para ser opaco e inenumerable.
  return randomBytes(32).toString("base64url");
}

function row(c: Record<string, unknown>): Contrato {
  return {
    id: String(c.id),
    tipo: c.tipo as TipoContrato,
    cliente_id: (c.cliente_id as string | null) ?? null,
    datos: (c.datos as DatosContrato) ?? ({} as DatosContrato),
    estado: c.estado as EstadoContrato,
    signing_token: (c.signing_token as string | null) ?? null,
    firma_propietario: (c.firma_propietario as Firma | null) ?? null,
    firma_agencia: (c.firma_agencia as Firma | null) ?? null,
    pdf_storage_path: (c.pdf_storage_path as string | null) ?? null,
    firmado_at: (c.firmado_at as string | null) ?? null,
    created_at: String(c.created_at),
    updated_at: String(c.updated_at),
  };
}

// Narrowing helpers (ergonomía en los flujos server-side).
export function esGestion(c: Contrato): c is Contrato & { datos: DatosContratoGestion } {
  return c.tipo === "gestion_alquiler";
}
export function esExclusiva(c: Contrato): c is Contrato & { datos: DatosContratoExclusiva } {
  return c.tipo === "exclusiva_venta";
}

// ---------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------

export async function listarContratos(): Promise<Contrato[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("contratos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row);
}

export async function getContrato(id: string): Promise<Contrato | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("contratos").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? row(data) : null;
}

export async function getContratoPorToken(token: string): Promise<Contrato | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("contratos")
    .select("*")
    .eq("signing_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? row(data) : null;
}

export async function crearContrato(input: {
  tipo?: TipoContrato;
  cliente_id?: string | null;
  datos: DatosContrato;
}): Promise<Contrato> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("contratos")
    .insert({
      tipo: input.tipo ?? "exclusiva_venta",
      cliente_id: input.cliente_id ?? null,
      datos: input.datos,
      estado: "borrador",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo crear el contrato");
  return row(data);
}

export async function actualizarDatosContrato(
  id: string,
  datos: DatosContrato,
): Promise<Contrato> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("contratos")
    .update({ datos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo actualizar el contrato");
  return row(data);
}

export async function generarLinkFirma(id: string): Promise<Contrato> {
  const admin = getSupabaseAdmin();
  const token = generarToken();
  const { data, error } = await admin
    .from("contratos")
    .update({ signing_token: token, estado: "pendiente_firmas", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo generar el link");
  return row(data);
}

export async function cancelarContrato(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("contratos")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function eliminarContrato(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("contratos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------
// Firma
// ---------------------------------------------------------------

export type RolFirmante = "propietario" | "agencia";

/**
 * Guarda la firma de una de las partes y actualiza el estado.
 * Si tras guardar hay firma de ambas, el estado pasa a "firmado" y
 * se marca firmado_at. La generación del PDF la dispara el caller.
 */
export async function firmarContrato(
  token: string,
  rol: RolFirmante,
  firma: Firma,
): Promise<Contrato> {
  const admin = getSupabaseAdmin();
  const existente = await getContratoPorToken(token);
  if (!existente) throw new Error("Contrato no encontrado");
  if (existente.estado === "cancelado" || existente.estado === "firmado") {
    throw new Error("El contrato ya no admite más firmas");
  }

  const campo = rol === "propietario" ? "firma_propietario" : "firma_agencia";
  const otraFirma = rol === "propietario" ? existente.firma_agencia : existente.firma_propietario;
  const ambasFirmadas = Boolean(otraFirma);

  const nuevoEstado: EstadoContrato = ambasFirmadas
    ? "firmado"
    : rol === "propietario"
      ? "firmado_propietario"
      : "firmado_agencia";

  const patch: Record<string, unknown> = {
    [campo]: firma,
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  };
  if (ambasFirmadas) patch.firmado_at = new Date().toISOString();

  const { data, error } = await admin
    .from("contratos")
    .update(patch)
    .eq("id", existente.id)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "No se pudo firmar");
  return row(data);
}

// ---------------------------------------------------------------
// Storage
// ---------------------------------------------------------------

export async function subirPdfContrato(
  contratoId: string,
  pdf: Uint8Array,
): Promise<string> {
  const admin = getSupabaseAdmin();
  const path = `${contratoId}.pdf`;
  const { error } = await admin.storage.from("contratos").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir PDF: ${error.message}`);
  await admin.from("contratos").update({ pdf_storage_path: path }).eq("id", contratoId);
  return path;
}

export async function descargarPdfContrato(contratoId: string): Promise<Uint8Array | null> {
  const admin = getSupabaseAdmin();
  const contrato = await getContrato(contratoId);
  if (!contrato?.pdf_storage_path) return null;
  const { data, error } = await admin.storage.from("contratos").download(contrato.pdf_storage_path);
  if (error || !data) return null;
  const buf = await data.arrayBuffer();
  return new Uint8Array(buf);
}
