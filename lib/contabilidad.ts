import { getSupabaseAdmin } from "./supabaseAdmin";

const IVA = 0.21;

function calcularComision(base: number, pct: number) {
  return Math.round(base * (pct / 100) * (1 + IVA) * 100) / 100;
}

export type TipoCliente = "propietario" | "estudiante" | "comprador" | "creditos";
export type OperacionCliente = "alquiler" | "venta" | null;
export type OrigenCliente = "manual" | "lead" | "autocompletado";

export type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: TipoCliente;
  tipo_secundario: TipoCliente | null;
  zona_interes: string | null;
  operacion: OperacionCliente;
  origen: OrigenCliente;
  lead_id: number | null;
  notas: string | null;
  token: string;
  datos_completados: boolean;
  mensualidad: number;
  comision_pct_alquiler: number;
  created_at: string;
  updated_at: string;
};

export type ClienteConActividad = Cliente & { tieneIngresos: boolean };

export type IngresoMensual = {
  id: string;
  cliente_id: string;
  mes: string;
  ingreso_bruto: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado: boolean;
  fecha_cobro: string | null;
  notas: string | null;
  created_at: string;
};

export type OperacionCompraventa = {
  id: string;
  cliente_id: string;
  fecha_cierre: string;
  precio_venta: number;
  comision_pct: number;
  comision_calculada: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoriaGasto =
  | "obra"
  | "reforma"
  | "notaria"
  | "registro"
  | "impuestos"
  | "ibi"
  | "comunidad"
  | "seguro"
  | "mantenimiento"
  | "propietario"
  | "comision"
  | "suministros"
  | "otros";

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string }[] = [
  { value: "propietario", label: "Renta al propietario" },
  { value: "comunidad", label: "Comunidad" },
  { value: "ibi", label: "IBI" },
  { value: "seguro", label: "Seguro" },
  { value: "suministros", label: "Suministros" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "obra", label: "Obra" },
  { value: "reforma", label: "Reforma" },
  { value: "notaria", label: "Notaría" },
  { value: "registro", label: "Registro" },
  { value: "impuestos", label: "Impuestos" },
  { value: "comision", label: "Comisión" },
  { value: "otros", label: "Otros" },
];

export type Gasto = {
  id: string;
  operacion_id: string;
  concepto: string;
  importe: number;
  categoria: CategoriaGasto;
  es_negativo: boolean;
  pagado: boolean;
  fecha_pago: string | null;
  created_at: string;
};

export type ClienteGasto = {
  id: string;
  cliente_id: string;
  concepto: string;
  importe: number;
  categoria: CategoriaGasto;
  es_recurrente: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  pagado: boolean;
  fecha_pago: string | null;
  notas: string | null;
  created_at: string;
};

// Neto de una operación = bruto (comisión) +/- cada movimiento liquidado,
// según el signo que se marcó al crearlo (gasto = negativo, ingreso extra = positivo).
export function netoDeOperacion(comisionCalculada: number, gastos: Gasto[]) {
  return (
    comisionCalculada +
    gastos.filter((g) => g.pagado).reduce((s, g) => s + (g.es_negativo ? -g.importe : g.importe), 0)
  );
}

export type Documento = {
  id: string;
  operacion_id: string;
  nombre: string;
  storage_path: string;
  created_at: string;
};

export type OperacionCredito = {
  id: string;
  cliente_id: string;
  fecha: string;
  precio: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

const DOCUMENTOS_BUCKET = "documentos";

export async function listarClientes(): Promise<ClienteConActividad[]> {
  const admin = getSupabaseAdmin();
  const [{ data, error }, { data: ingresosData, error: ingresosError }] = await Promise.all([
    admin.from("clientes").select("*").order("created_at", { ascending: false }),
    admin.from("cliente_ingresos").select("cliente_id"),
  ]);
  if (error) throw error;
  if (ingresosError) throw ingresosError;
  const idsConIngresos = new Set((ingresosData ?? []).map((r) => r.cliente_id as string));
  return ((data ?? []) as Cliente[]).map((c) => ({ ...c, tieneIngresos: idsConIngresos.has(c.id) }));
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Cliente | null;
}

export async function getClientePorToken(token: string): Promise<Cliente | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("clientes").select("*").eq("token", token).maybeSingle();
  if (error) throw error;
  return data as Cliente | null;
}

export async function crearCliente(input: {
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  tipo: TipoCliente;
  tipo_secundario?: TipoCliente | null;
  zona_interes?: string;
  operacion?: OperacionCliente;
  origen?: OrigenCliente;
  lead_id?: number;
  notas?: string;
  mensualidad?: number;
  comision_pct_alquiler?: number;
}): Promise<Cliente> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("clientes")
    .insert({
      nombre: input.nombre,
      apellidos: input.apellidos || null,
      telefono: input.telefono || null,
      email: input.email || null,
      tipo: input.tipo,
      tipo_secundario: input.tipo_secundario ?? null,
      zona_interes: input.zona_interes || null,
      operacion: input.operacion || null,
      origen: input.origen || "manual",
      lead_id: input.lead_id ?? null,
      notas: input.notas || null,
      mensualidad: input.mensualidad ?? 0,
      comision_pct_alquiler: input.comision_pct_alquiler ?? 15,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function actualizarCliente(
  id: string,
  patch: Partial<{
    nombre: string;
    apellidos: string | null;
    telefono: string | null;
    email: string | null;
    tipo: TipoCliente;
    tipo_secundario: TipoCliente | null;
    zona_interes: string | null;
    operacion: OperacionCliente;
    notas: string | null;
    mensualidad: number;
    comision_pct_alquiler: number;
  }>
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("clientes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function actualizarDatosPublicos(
  token: string,
  data: {
    nombre: string;
    apellidos?: string;
    telefono?: string;
    tipo: TipoCliente;
    zona_interes?: string;
    operacion?: OperacionCliente;
  }
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("clientes")
    .update({
      nombre: data.nombre,
      apellidos: data.apellidos || null,
      telefono: data.telefono || null,
      tipo: data.tipo,
      zona_interes: data.zona_interes || null,
      operacion: data.operacion || null,
      datos_completados: true,
      updated_at: new Date().toISOString(),
    })
    .eq("token", token);
  if (error) throw error;
}

export async function eliminarCliente(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("clientes").delete().eq("id", id);
  if (error) throw error;
}

export async function listarIngresos(clienteId: string): Promise<IngresoMensual[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cliente_ingresos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("mes", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IngresoMensual[];
}

export async function añadirIngreso(clienteId: string, mes: string, ingresoBruto: number, comisionPct = 15, notas?: string) {
  const admin = getSupabaseAdmin();
  const comision_calculada = calcularComision(ingresoBruto, comisionPct);
  const { error } = await admin
    .from("cliente_ingresos")
    .upsert(
      { cliente_id: clienteId, mes, ingreso_bruto: ingresoBruto, comision_pct: comisionPct, comision_calculada, notas: notas || null },
      { onConflict: "cliente_id,mes" }
    );
  if (error) throw error;
}

export async function eliminarIngreso(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("cliente_ingresos").delete().eq("id", id);
  if (error) throw error;
}

export async function eliminarTodosLosIngresos(clienteId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("cliente_ingresos").delete().eq("cliente_id", clienteId);
  if (error) throw error;
}

export async function marcarIngresoCobrado(id: string, cobrado: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("cliente_ingresos")
    .update({ cobrado, fecha_cobro: cobrado ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
}

// ============================================================
// Gastos por cliente (recurrentes y puntuales) para alquileres.
// ============================================================

export async function listarClienteGastos(clienteId: string): Promise<ClienteGasto[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cliente_gasto")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("es_recurrente", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClienteGasto[];
}

export async function crearClienteGasto(input: {
  cliente_id: string;
  concepto: string;
  importe: number;
  categoria: CategoriaGasto;
  es_recurrente: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  fecha_pago?: string | null;
  pagado?: boolean;
  notas?: string | null;
}): Promise<ClienteGasto> {
  const admin = getSupabaseAdmin();
  const row: Record<string, unknown> = {
    cliente_id: input.cliente_id,
    concepto: input.concepto,
    importe: input.importe,
    categoria: input.categoria,
    es_recurrente: input.es_recurrente,
    notas: input.notas ?? null,
  };
  if (input.es_recurrente) {
    row.fecha_inicio = input.fecha_inicio ?? new Date().toISOString().slice(0, 10);
    row.fecha_fin = input.fecha_fin ?? null;
    row.pagado = true;
  } else {
    row.pagado = input.pagado ?? false;
    row.fecha_pago = input.pagado ? input.fecha_pago ?? new Date().toISOString().slice(0, 10) : null;
  }
  const { data, error } = await admin.from("cliente_gasto").insert(row).select().single();
  if (error) throw error;
  return data as ClienteGasto;
}

export async function marcarClienteGastoPagado(id: string, pagado: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("cliente_gasto")
    .update({ pagado, fecha_pago: pagado ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
}

export async function terminarClienteGastoRecurrente(id: string, fechaFin: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("cliente_gasto").update({ fecha_fin: fechaFin }).eq("id", id);
  if (error) throw error;
}

export async function eliminarClienteGasto(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("cliente_gasto").delete().eq("id", id);
  if (error) throw error;
}

// Devuelve el gasto total imputado a un mes concreto: puntuales pagados en ese
// mes + prorrata de cada recurrente activo en ese mes.
function primerDia(mes: string) {
  return mes.length === 7 ? `${mes}-01` : mes.slice(0, 10);
}

export function gastoDelMes(gastos: ClienteGasto[], mes: string): number {
  const dia1 = primerDia(mes);
  let total = 0;
  for (const g of gastos) {
    if (g.es_recurrente) {
      const inicio = g.fecha_inicio ?? null;
      const fin = g.fecha_fin ?? null;
      if (inicio && inicio > dia1) continue;
      if (fin && fin < dia1) continue;
      total += Number(g.importe);
    } else if (g.pagado && g.fecha_pago && g.fecha_pago.slice(0, 7) === mes.slice(0, 7)) {
      total += Number(g.importe);
    }
  }
  return total;
}

export function gastoTotalCliente(gastos: ClienteGasto[]): number {
  return gastos.reduce((s, g) => {
    if (g.es_recurrente || g.pagado) return s + Number(g.importe);
    return s;
  }, 0);
}

export async function listarOperaciones(): Promise<OperacionCompraventa[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("operaciones_compraventa").select("*").order("fecha_cierre", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OperacionCompraventa[];
}

// mes en formato "YYYY-MM". Compraventas cerradas ese mes.
export async function listarOperacionesPorMes(mes: string): Promise<OperacionCompraventa[]> {
  const admin = getSupabaseAdmin();
  const inicio = `${mes}-01`;
  const d = new Date(inicio);
  const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("operaciones_compraventa")
    .select("*")
    .gte("fecha_cierre", inicio)
    .lt("fecha_cierre", fin)
    .order("fecha_cierre", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OperacionCompraventa[];
}

// mes en formato "YYYY-MM". Ingresos de alquiler de ese mes, de todos los clientes.
export async function listarIngresosPorMes(mes: string): Promise<(IngresoMensual & { clienteNombre: string })[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cliente_ingresos")
    .select("*, clientes(nombre, apellidos)")
    .eq("mes", `${mes}-01`)
    .order("comision_calculada", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (IngresoMensual & { clientes: { nombre: string; apellidos: string | null } | null })[]).map((r) => ({
    ...r,
    clienteNombre: `${r.clientes?.nombre ?? ""} ${r.clientes?.apellidos ?? ""}`.trim() || "Cliente desconocido",
  }));
}

export async function crearOperacion(input: {
  cliente_id: string;
  fecha_cierre: string;
  precio_venta: number;
  comision_pct?: number;
  notas?: string;
}): Promise<OperacionCompraventa> {
  const admin = getSupabaseAdmin();
  const comision_pct = input.comision_pct ?? 3;
  const comision_calculada = calcularComision(input.precio_venta, comision_pct);
  const { data, error } = await admin
    .from("operaciones_compraventa")
    .insert({
      cliente_id: input.cliente_id,
      fecha_cierre: input.fecha_cierre,
      precio_venta: input.precio_venta,
      comision_pct,
      comision_calculada,
      notas: input.notas || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as OperacionCompraventa;
}

export async function actualizarOperacion(
  id: string,
  patch: Partial<{ precio_venta: number; comision_pct: number; comision_calculada: number; fecha_cierre: string; notas: string | null }>
) {
  const admin = getSupabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.fecha_cierre !== undefined) update.fecha_cierre = patch.fecha_cierre;
  if (patch.notas !== undefined) update.notas = patch.notas;
  if (patch.precio_venta !== undefined) update.precio_venta = patch.precio_venta;
  if (patch.comision_pct !== undefined) update.comision_pct = patch.comision_pct;
  // Si viene comision_calculada explícita, la respetamos (override manual).
  // Si no, y hay precio o pct nuevos, recalculamos con lo actual + patch.
  if (patch.comision_calculada !== undefined) {
    update.comision_calculada = patch.comision_calculada;
  } else if (patch.precio_venta !== undefined || patch.comision_pct !== undefined) {
    const { data: actual } = await admin.from("operaciones_compraventa").select("precio_venta, comision_pct").eq("id", id).maybeSingle();
    const precio = patch.precio_venta ?? Number(actual?.precio_venta ?? 0);
    const pct = patch.comision_pct ?? Number(actual?.comision_pct ?? 0);
    update.comision_calculada = calcularComision(precio, pct);
  }
  const { error } = await admin.from("operaciones_compraventa").update(update).eq("id", id);
  if (error) throw error;
}

export async function eliminarOperacion(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("operaciones_compraventa").delete().eq("id", id);
  if (error) throw error;
}

export async function listarGastos(operacionId: string): Promise<Gasto[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("operacion_gastos")
    .select("*")
    .eq("operacion_id", operacionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Gasto[];
}

export async function añadirGasto(operacionId: string, concepto: string, importe: number, esNegativo = true, categoria: CategoriaGasto = "otros") {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("operacion_gastos")
    .insert({ operacion_id: operacionId, concepto, importe, es_negativo: esNegativo, categoria });
  if (error) throw error;
}

export async function actualizarCategoriaGasto(id: string, categoria: CategoriaGasto) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("operacion_gastos").update({ categoria }).eq("id", id);
  if (error) throw error;
}

export async function marcarGastoPagado(id: string, pagado: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("operacion_gastos")
    .update({ pagado, fecha_pago: pagado ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarGasto(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("operacion_gastos").delete().eq("id", id);
  if (error) throw error;
}

export async function listarDocumentos(operacionId: string): Promise<Documento[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("operacion_documentos")
    .select("*")
    .eq("operacion_id", operacionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Documento[];
}

export async function subirDocumento(operacionId: string, nombre: string, buffer: Buffer, contentType: string): Promise<Documento> {
  const admin = getSupabaseAdmin();
  const path = `${operacionId}/${Date.now()}-${nombre}`;
  const { error: uploadError } = await admin.storage.from(DOCUMENTOS_BUCKET).upload(path, buffer, { contentType });
  if (uploadError) throw uploadError;

  const { data, error } = await admin
    .from("operacion_documentos")
    .insert({ operacion_id: operacionId, nombre, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data as Documento;
}

export async function descargarDocumento(id: string): Promise<{ nombre: string; buffer: Buffer } | null> {
  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("operacion_documentos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!doc) return null;
  const { data: file, error: downloadError } = await admin.storage.from(DOCUMENTOS_BUCKET).download(doc.storage_path);
  if (downloadError) throw downloadError;
  const buffer = Buffer.from(await file.arrayBuffer());
  return { nombre: doc.nombre, buffer };
}

export async function buscarDocumentosPorOperacion(busqueda: string): Promise<{ documento: Documento; clienteNombre: string }[]> {
  const admin = getSupabaseAdmin();
  const { data: operaciones, error: opError } = await admin.from("operaciones_compraventa").select("id, clientes(nombre)");
  if (opError) throw opError;

  const termino = busqueda.toLowerCase();
  const resultados: { documento: Documento; clienteNombre: string }[] = [];
  for (const op of (operaciones ?? []) as unknown as { id: string; clientes: { nombre: string } | null }[]) {
    if (!op.clientes || !op.clientes.nombre.toLowerCase().includes(termino)) continue;
    const documentos = await listarDocumentos(op.id);
    documentos.forEach((documento) => resultados.push({ documento, clienteNombre: op.clientes!.nombre }));
  }
  return resultados;
}

export async function eliminarDocumento(id: string) {
  const admin = getSupabaseAdmin();
  const { data: doc, error: getError } = await admin.from("operacion_documentos").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!doc) return;
  await admin.storage.from(DOCUMENTOS_BUCKET).remove([doc.storage_path]);
  const { error } = await admin.from("operacion_documentos").delete().eq("id", id);
  if (error) throw error;
}

export async function listarOperacionesCreditos(): Promise<OperacionCredito[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("operaciones_creditos").select("*").order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OperacionCredito[];
}

export async function crearOperacionCredito(input: {
  cliente_id: string;
  fecha: string;
  precio: number;
  notas?: string;
}): Promise<OperacionCredito> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("operaciones_creditos")
    .insert({ cliente_id: input.cliente_id, fecha: input.fecha, precio: input.precio, notas: input.notas || null })
    .select()
    .single();
  if (error) throw error;
  return data as OperacionCredito;
}

export async function eliminarOperacionCredito(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("operaciones_creditos").delete().eq("id", id);
  if (error) throw error;
}

export async function listarCreditoGastos(operacionId: string): Promise<Gasto[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("credito_gastos")
    .select("*")
    .eq("operacion_id", operacionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Gasto[];
}

export async function añadirCreditoGasto(operacionId: string, concepto: string, importe: number, esNegativo = true, categoria: CategoriaGasto = "otros") {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("credito_gastos")
    .insert({ operacion_id: operacionId, concepto, importe, es_negativo: esNegativo, categoria });
  if (error) throw error;
}

export async function actualizarCategoriaCreditoGasto(id: string, categoria: CategoriaGasto) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("credito_gastos").update({ categoria }).eq("id", id);
  if (error) throw error;
}

export async function marcarCreditoGastoPagado(id: string, pagado: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("credito_gastos")
    .update({ pagado, fecha_pago: pagado ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarCreditoGasto(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("credito_gastos").delete().eq("id", id);
  if (error) throw error;
}

export async function listarCreditoDocumentos(operacionId: string): Promise<Documento[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("credito_documentos")
    .select("*")
    .eq("operacion_id", operacionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Documento[];
}

export async function subirCreditoDocumento(operacionId: string, nombre: string, buffer: Buffer, contentType: string): Promise<Documento> {
  const admin = getSupabaseAdmin();
  const path = `creditos/${operacionId}/${Date.now()}-${nombre}`;
  const { error: uploadError } = await admin.storage.from(DOCUMENTOS_BUCKET).upload(path, buffer, { contentType });
  if (uploadError) throw uploadError;

  const { data, error } = await admin
    .from("credito_documentos")
    .insert({ operacion_id: operacionId, nombre, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data as Documento;
}

export async function descargarCreditoDocumento(id: string): Promise<{ nombre: string; buffer: Buffer } | null> {
  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("credito_documentos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!doc) return null;
  const { data: file, error: downloadError } = await admin.storage.from(DOCUMENTOS_BUCKET).download(doc.storage_path);
  if (downloadError) throw downloadError;
  const buffer = Buffer.from(await file.arrayBuffer());
  return { nombre: doc.nombre, buffer };
}

export async function eliminarCreditoDocumento(id: string) {
  const admin = getSupabaseAdmin();
  const { data: doc, error: getError } = await admin.from("credito_documentos").select("*").eq("id", id).maybeSingle();
  if (getError) throw getError;
  if (!doc) return;
  await admin.storage.from(DOCUMENTOS_BUCKET).remove([doc.storage_path]);
  const { error } = await admin.from("credito_documentos").delete().eq("id", id);
  if (error) throw error;
}

export type GastoFijo = {
  id: string;
  concepto: string;
  importe_mensual: number;
  categoria: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  created_at: string;
};

export async function listarGastosFijos(): Promise<GastoFijo[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("gastos_fijos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GastoFijo[];
}

export async function crearGastoFijo(input: {
  concepto: string;
  importe_mensual: number;
  categoria?: string;
  fecha_inicio?: string;
  notas?: string;
}): Promise<GastoFijo> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("gastos_fijos")
    .insert({
      concepto: input.concepto,
      importe_mensual: input.importe_mensual,
      categoria: input.categoria || "otros",
      fecha_inicio: input.fecha_inicio || new Date().toISOString().slice(0, 10),
      notas: input.notas || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as GastoFijo;
}

export async function terminarGastoFijo(id: string, fechaFin: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("gastos_fijos").update({ fecha_fin: fechaFin }).eq("id", id);
  if (error) throw error;
}

export async function eliminarGastoFijo(id: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("gastos_fijos").delete().eq("id", id);
  if (error) throw error;
}

function gastoFijoActivoEnMes(g: GastoFijo, primerDiaMes: Date, ultimoDiaMes: Date): boolean {
  const inicio = new Date(g.fecha_inicio);
  if (inicio > ultimoDiaMes) return false;
  if (g.fecha_fin) {
    const fin = new Date(g.fecha_fin);
    if (fin < primerDiaMes) return false;
  }
  return true;
}

// Coste acumulado desde fecha_inicio de cada gasto hasta hoy (o fecha_fin).
function acumuladoGastosFijos(gastos: GastoFijo[]): number {
  const hoy = new Date();
  return gastos.reduce((s, g) => {
    const inicio = new Date(g.fecha_inicio);
    const fin = g.fecha_fin ? new Date(g.fecha_fin) : hoy;
    const hasta = fin < hoy ? fin : hoy;
    if (hasta < inicio) return s;
    const meses = (hasta.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - inicio.getUTCMonth()) + 1;
    return s + Number(g.importe_mensual) * Math.max(meses, 0);
  }, 0);
}

export async function balanceTotal() {
  const admin = getSupabaseAdmin();
  const [ingresosRes, operacionesRes, gastosRes, creditosRes, creditoGastosRes, clienteGastosRes, gastosFijosRes] = await Promise.all([
    admin.from("cliente_ingresos").select("comision_calculada"),
    admin.from("operaciones_compraventa").select("comision_calculada"),
    admin.from("operacion_gastos").select("importe, es_negativo, pagado"),
    admin.from("operaciones_creditos").select("precio"),
    admin.from("credito_gastos").select("importe, es_negativo, pagado"),
    admin.from("cliente_gasto").select("importe, es_recurrente, pagado, fecha_inicio, fecha_fin"),
    admin.from("gastos_fijos").select("importe_mensual, fecha_inicio, fecha_fin"),
  ]);
  if (ingresosRes.error) throw ingresosRes.error;
  if (operacionesRes.error) throw operacionesRes.error;
  if (gastosRes.error) throw gastosRes.error;
  if (creditosRes.error) throw creditosRes.error;
  if (creditoGastosRes.error) throw creditoGastosRes.error;
  if (clienteGastosRes.error) console.warn("[balance/cliente_gasto]", clienteGastosRes.error.message);
  if (gastosFijosRes.error) console.warn("[balance/gastos_fijos]", gastosFijosRes.error.message);

  const comisionAlquileres = (ingresosRes.data ?? []).reduce((s, r) => s + Number(r.comision_calculada), 0);
  const comisionCompraventas = (operacionesRes.data ?? []).reduce((s, r) => s + Number(r.comision_calculada), 0);

  type Movimiento = { importe: number; es_negativo: boolean; pagado: boolean };
  const pagados = (rows: Movimiento[]) => rows.filter((r) => r.pagado);
  const movimientoNeto = (rows: Movimiento[]) =>
    pagados(rows).reduce((s, r) => s + (r.es_negativo ? -Number(r.importe) : Number(r.importe)), 0);
  const gastosPagados = (rows: Movimiento[]) =>
    pagados(rows).filter((r) => r.es_negativo).reduce((s, r) => s + Number(r.importe), 0);

  const totalGastosCompraventas = gastosPagados((gastosRes.data ?? []) as Movimiento[]);
  const netoCompraventas = comisionCompraventas + movimientoNeto((gastosRes.data ?? []) as Movimiento[]);

  const precioCreditos = (creditosRes.data ?? []).reduce((s, r) => s + Number(r.precio), 0);
  const netoCreditos = precioCreditos + movimientoNeto((creditoGastosRes.data ?? []) as Movimiento[]);

  // Gastos de alquiler acumulados desde su fecha_inicio hasta hoy (recurrentes)
  // + puntuales pagados. Rough approximation: cada recurrente cuenta N meses
  // completos desde su inicio hasta min(hoy, fecha_fin).
  const hoy = new Date();
  const totalGastosAlquileres = (clienteGastosRes.data ?? []).reduce((s, r) => {
    if (r.es_recurrente) {
      const inicio = r.fecha_inicio ? new Date(r.fecha_inicio as string) : hoy;
      const fin = r.fecha_fin ? new Date(r.fecha_fin as string) : hoy;
      const hasta = fin < hoy ? fin : hoy;
      if (hasta < inicio) return s;
      const meses = (hasta.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - inicio.getUTCMonth()) + 1;
      return s + Number(r.importe) * Math.max(meses, 0);
    }
    return r.pagado ? s + Number(r.importe) : s;
  }, 0);
  const netoAlquileres = comisionAlquileres - totalGastosAlquileres;

  const gastosFijos = (gastosFijosRes.data ?? []) as unknown as GastoFijo[];
  const gastoFijoMensual = gastosFijos
    .filter((g) => !g.fecha_fin || new Date(g.fecha_fin) >= hoy)
    .reduce((s, g) => s + Number(g.importe_mensual), 0);
  const gastoFijoAcumulado = acumuladoGastosFijos(gastosFijos);

  const beneficioNetoOperativo = netoAlquileres + netoCompraventas + netoCreditos;
  const beneficioNetoFinal = beneficioNetoOperativo - gastoFijoAcumulado;

  return {
    comisionBrutaTotal: comisionAlquileres + comisionCompraventas + precioCreditos,
    beneficioNetoTotal: beneficioNetoFinal,
    alquileres: { comisionBruta: comisionAlquileres, gastos: totalGastosAlquileres, neto: netoAlquileres },
    compraventas: { comisionBruta: comisionCompraventas, gastos: totalGastosCompraventas, neto: netoCompraventas },
    creditos: { bruto: precioCreditos, neto: netoCreditos },
    gastosFijos: {
      mensual: gastoFijoMensual,
      anualizado: gastoFijoMensual * 12,
      acumulado: gastoFijoAcumulado,
      pctSobreBruto: (comisionAlquileres + comisionCompraventas + precioCreditos) > 0
        ? (gastoFijoAcumulado / (comisionAlquileres + comisionCompraventas + precioCreditos)) * 100
        : 0,
      pctSobreNetoOperativo: beneficioNetoOperativo > 0 ? (gastoFijoAcumulado / beneficioNetoOperativo) * 100 : 0,
    },
  };
}

export type MetricasMes = {
  mes: number;
  bruto: number;
  gastos: number;
  neto: number;
  alquileres: number;
  compraventas: number;
  creditos: number;
  gastosFijos: number;
};

export type MetricasAnuales = {
  anio: number;
  meses: MetricasMes[];
  mesesAnterior: MetricasMes[];
  trimestres: { trimestre: number; bruto: number; gastos: number; neto: number }[];
  totalAnual: {
    bruto: number;
    gastos: number;
    neto: number;
    alquileres: number;
    compraventas: number;
    creditos: number;
    gastosFijos: number;
    netoTrasFijos: number;
    pctFijosSobreBruto: number;
    pctFijosSobreNeto: number;
  };
  anioAnterior: { bruto: number; neto: number } | null;
  variacion: { brutoPct: number | null; netoPct: number | null };
  aniosDisponibles: number[];
};

export async function listarAniosConDatos(): Promise<number[]> {
  const admin = getSupabaseAdmin();
  const [a, b, c] = await Promise.all([
    admin.from("cliente_ingresos").select("mes").order("mes", { ascending: true }).limit(1),
    admin.from("operaciones_compraventa").select("fecha_cierre").order("fecha_cierre", { ascending: true }).limit(1),
    admin.from("operaciones_creditos").select("fecha").order("fecha", { ascending: true }).limit(1),
  ]);
  const fechas = [a.data?.[0]?.mes, b.data?.[0]?.fecha_cierre, c.data?.[0]?.fecha].filter(Boolean) as string[];
  const anioActual = new Date().getUTCFullYear();
  const anioMin = fechas.length ? Math.min(...fechas.map((f) => new Date(f).getUTCFullYear())) : anioActual;
  const out: number[] = [];
  for (let y = anioActual; y >= anioMin; y--) out.push(y);
  return out;
}

// Desglose mensual/trimestral de un año (bruto, gastos liquidados y neto, por
// categoría), más el total del año anterior para comparar. Los gastos se
// imputan al mes en que se liquidaron (fecha_pago), no al de la operación.
export async function metricasAnuales(anio: number): Promise<MetricasAnuales> {
  const admin = getSupabaseAdmin();

  const desde = `${anio - 1}-01-01`;
  const hasta = `${anio + 1}-01-01`;

  const [ingresosRes, operacionesRes, gastosRes, creditosRes, creditoGastosRes, clienteGastosRes, gastosFijosRes] = await Promise.all([
    admin.from("cliente_ingresos").select("mes, comision_calculada").gte("mes", desde).lt("mes", hasta),
    admin.from("operaciones_compraventa").select("fecha_cierre, comision_calculada").gte("fecha_cierre", desde).lt("fecha_cierre", hasta),
    admin.from("operacion_gastos").select("fecha_pago, importe, es_negativo, pagado").eq("pagado", true).gte("fecha_pago", desde).lt("fecha_pago", hasta),
    admin.from("operaciones_creditos").select("fecha, precio").gte("fecha", desde).lt("fecha", hasta),
    admin.from("credito_gastos").select("fecha_pago, importe, es_negativo, pagado").eq("pagado", true).gte("fecha_pago", desde).lt("fecha_pago", hasta),
    admin.from("cliente_gasto").select("importe, categoria, es_recurrente, fecha_inicio, fecha_fin, pagado, fecha_pago"),
    admin.from("gastos_fijos").select("importe_mensual, fecha_inicio, fecha_fin"),
  ]);
  if (ingresosRes.error) throw ingresosRes.error;
  if (operacionesRes.error) throw operacionesRes.error;
  if (gastosRes.error) throw gastosRes.error;
  if (creditosRes.error) throw creditosRes.error;
  if (creditoGastosRes.error) throw creditoGastosRes.error;
  if (clienteGastosRes.error) console.warn("[metricas/cliente_gasto]", clienteGastosRes.error.message);
  if (gastosFijosRes.error) console.warn("[metricas/gastos_fijos]", gastosFijosRes.error.message);

  function bucket(anioObjetivo: number): MetricasMes[] {
    const meses: MetricasMes[] = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      bruto: 0,
      gastos: 0,
      neto: 0,
      alquileres: 0,
      compraventas: 0,
      creditos: 0,
      gastosFijos: 0,
    }));

    for (const r of ingresosRes.data ?? []) {
      const d = new Date(r.mes as string);
      if (d.getUTCFullYear() !== anioObjetivo) continue;
      const m = meses[d.getUTCMonth()];
      const v = Number(r.comision_calculada);
      m.alquileres += v;
      m.bruto += v;
      m.neto += v;
    }
    for (const r of operacionesRes.data ?? []) {
      const d = new Date(r.fecha_cierre as string);
      if (d.getUTCFullYear() !== anioObjetivo) continue;
      const m = meses[d.getUTCMonth()];
      const v = Number(r.comision_calculada);
      m.compraventas += v;
      m.bruto += v;
      m.neto += v;
    }
    for (const r of creditosRes.data ?? []) {
      const d = new Date(r.fecha as string);
      if (d.getUTCFullYear() !== anioObjetivo) continue;
      const m = meses[d.getUTCMonth()];
      const v = Number(r.precio);
      m.creditos += v;
      m.bruto += v;
      m.neto += v;
    }
    for (const r of [...(gastosRes.data ?? []), ...(creditoGastosRes.data ?? [])]) {
      if (!r.fecha_pago) continue;
      const d = new Date(r.fecha_pago as string);
      if (d.getUTCFullYear() !== anioObjetivo) continue;
      const m = meses[d.getUTCMonth()];
      const v = Number(r.importe);
      if (r.es_negativo) m.gastos += v;
      m.neto += r.es_negativo ? -v : v;
    }
    // Gastos de alquiler: recurrentes se prorratean por cada mes activo dentro
    // del año; puntuales se imputan a su fecha_pago si están marcados pagados.
    for (const r of clienteGastosRes.data ?? []) {
      const importe = Number(r.importe);
      if (r.es_recurrente) {
        const inicio = r.fecha_inicio ? new Date(r.fecha_inicio as string) : new Date(anioObjetivo, 0, 1);
        const fin = r.fecha_fin ? new Date(r.fecha_fin as string) : new Date(anioObjetivo, 11, 31);
        for (let i = 0; i < 12; i++) {
          const primerDiaMes = new Date(Date.UTC(anioObjetivo, i, 1));
          const ultimoDiaMes = new Date(Date.UTC(anioObjetivo, i + 1, 0));
          if (inicio > ultimoDiaMes) continue;
          if (fin < primerDiaMes) continue;
          meses[i].gastos += importe;
          meses[i].neto -= importe;
        }
      } else if (r.pagado && r.fecha_pago) {
        const d = new Date(r.fecha_pago as string);
        if (d.getUTCFullYear() !== anioObjetivo) continue;
        const m = meses[d.getUTCMonth()];
        m.gastos += importe;
        m.neto -= importe;
      }
    }
    // Gastos fijos: prorrata mensual mientras estén activos.
    for (const g of (gastosFijosRes.data ?? []) as unknown as GastoFijo[]) {
      const inicio = new Date(g.fecha_inicio);
      const fin = g.fecha_fin ? new Date(g.fecha_fin) : null;
      const importe = Number(g.importe_mensual);
      for (let i = 0; i < 12; i++) {
        const primerDiaMes = new Date(Date.UTC(anioObjetivo, i, 1));
        const ultimoDiaMes = new Date(Date.UTC(anioObjetivo, i + 1, 0));
        if (inicio > ultimoDiaMes) continue;
        if (fin && fin < primerDiaMes) continue;
        meses[i].gastosFijos += importe;
      }
    }
    return meses;
  }

  const meses = bucket(anio);
  const mesesAnterior = bucket(anio - 1);

  const trimestres = [0, 1, 2, 3].map((q) => {
    const grupo = meses.slice(q * 3, q * 3 + 3);
    return {
      trimestre: q + 1,
      bruto: grupo.reduce((s, m) => s + m.bruto, 0),
      gastos: grupo.reduce((s, m) => s + m.gastos, 0),
      neto: grupo.reduce((s, m) => s + m.neto, 0),
    };
  });

  const totalBase = meses.reduce(
    (acc, m) => ({
      bruto: acc.bruto + m.bruto,
      gastos: acc.gastos + m.gastos,
      neto: acc.neto + m.neto,
      alquileres: acc.alquileres + m.alquileres,
      compraventas: acc.compraventas + m.compraventas,
      creditos: acc.creditos + m.creditos,
      gastosFijos: acc.gastosFijos + m.gastosFijos,
    }),
    { bruto: 0, gastos: 0, neto: 0, alquileres: 0, compraventas: 0, creditos: 0, gastosFijos: 0 }
  );
  const totalAnual = {
    ...totalBase,
    netoTrasFijos: totalBase.neto - totalBase.gastosFijos,
    pctFijosSobreBruto: totalBase.bruto > 0 ? (totalBase.gastosFijos / totalBase.bruto) * 100 : 0,
    pctFijosSobreNeto: totalBase.neto > 0 ? (totalBase.gastosFijos / totalBase.neto) * 100 : 0,
  };

  const totalAnterior = mesesAnterior.reduce((acc, m) => ({ bruto: acc.bruto + m.bruto, neto: acc.neto + m.neto }), { bruto: 0, neto: 0 });
  const huboAnterior = mesesAnterior.some((m) => m.bruto !== 0 || m.neto !== 0);

  return {
    anio,
    meses,
    mesesAnterior,
    trimestres,
    totalAnual,
    anioAnterior: huboAnterior ? totalAnterior : null,
    variacion: {
      brutoPct: huboAnterior && totalAnterior.bruto !== 0 ? ((totalAnual.bruto - totalAnterior.bruto) / Math.abs(totalAnterior.bruto)) * 100 : null,
      netoPct: huboAnterior && totalAnterior.neto !== 0 ? ((totalAnual.neto - totalAnterior.neto) / Math.abs(totalAnterior.neto)) * 100 : null,
    },
    aniosDisponibles: await listarAniosConDatos(),
  };
}
