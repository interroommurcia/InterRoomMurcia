import { getSupabaseAdmin } from "./supabaseAdmin";

const IVA = 0.21;

function calcularComision(base: number, pct: number) {
  return Math.round(base * (pct / 100) * (1 + IVA) * 100) / 100;
}

export type TipoCliente = "propietario" | "estudiante" | "comprador";
export type OperacionCliente = "alquiler" | "venta" | null;
export type OrigenCliente = "manual" | "lead" | "autocompletado";

export type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: TipoCliente;
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

export type Gasto = {
  id: string;
  operacion_id: string;
  concepto: string;
  importe: number;
  es_negativo: boolean;
  pagado: boolean;
  fecha_pago: string | null;
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

function primerDiaMes(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// Genera automáticamente los meses que falten hasta el mes actual usando la
// mensualidad activa del cliente, sin tocar meses ya registrados (manuales o
// de un cobro anterior). Si mensualidad es 0, el cliente está "pausado" y no
// se genera nada.
export async function sincronizarIngresosCliente(cliente: Cliente) {
  if (!cliente.mensualidad || cliente.mensualidad <= 0) return;
  const admin = getSupabaseAdmin();
  const { data: ultimos, error } = await admin
    .from("cliente_ingresos")
    .select("mes")
    .eq("cliente_id", cliente.id)
    .order("mes", { ascending: false })
    .limit(1);
  if (error) throw error;

  const mesActual = primerDiaMes(new Date());
  let cursor = ultimos?.[0]
    ? (() => {
        const u = new Date(ultimos[0].mes);
        return new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth() + 1, 1));
      })()
    : mesActual;

  const filas: { cliente_id: string; mes: string; ingreso_bruto: number; comision_pct: number; comision_calculada: number }[] = [];
  while (cursor <= mesActual) {
    filas.push({
      cliente_id: cliente.id,
      mes: cursor.toISOString().slice(0, 10),
      ingreso_bruto: cliente.mensualidad,
      comision_pct: cliente.comision_pct_alquiler,
      comision_calculada: calcularComision(cliente.mensualidad, cliente.comision_pct_alquiler),
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  if (filas.length === 0) return;

  const { error: insertError } = await admin
    .from("cliente_ingresos")
    .upsert(filas, { onConflict: "cliente_id,mes", ignoreDuplicates: true });
  if (insertError) throw insertError;
}

export async function sincronizarTodosLosIngresos() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("clientes").select("*").gt("mensualidad", 0);
  if (error) throw error;
  for (const cliente of (data ?? []) as Cliente[]) {
    await sincronizarIngresosCliente(cliente);
  }
}

export async function listarIngresos(clienteId: string): Promise<IngresoMensual[]> {
  const admin = getSupabaseAdmin();
  const cliente = await getCliente(clienteId);
  if (cliente) await sincronizarIngresosCliente(cliente);
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

export async function marcarIngresoCobrado(id: string, cobrado: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("cliente_ingresos")
    .update({ cobrado, fecha_cobro: cobrado ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  if (error) throw error;
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

export async function añadirGasto(operacionId: string, concepto: string, importe: number, esNegativo = true) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("operacion_gastos")
    .insert({ operacion_id: operacionId, concepto, importe, es_negativo: esNegativo });
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

export async function balanceTotal() {
  await sincronizarTodosLosIngresos();
  const admin = getSupabaseAdmin();
  const [ingresosRes, operacionesRes, gastosRes] = await Promise.all([
    admin.from("cliente_ingresos").select("comision_calculada"),
    admin.from("operaciones_compraventa").select("comision_calculada"),
    admin.from("operacion_gastos").select("importe"),
  ]);
  if (ingresosRes.error) throw ingresosRes.error;
  if (operacionesRes.error) throw operacionesRes.error;
  if (gastosRes.error) throw gastosRes.error;

  const comisionAlquileres = (ingresosRes.data ?? []).reduce((s, r) => s + Number(r.comision_calculada), 0);
  const comisionCompraventas = (operacionesRes.data ?? []).reduce((s, r) => s + Number(r.comision_calculada), 0);
  const totalGastos = (gastosRes.data ?? []).reduce((s, r) => s + Number(r.importe), 0);

  return {
    comisionBrutaTotal: comisionAlquileres + comisionCompraventas,
    beneficioNetoTotal: comisionAlquileres + (comisionCompraventas - totalGastos),
    alquileres: { comisionBruta: comisionAlquileres },
    compraventas: { comisionBruta: comisionCompraventas, gastos: totalGastos, neto: comisionCompraventas - totalGastos },
  };
}
