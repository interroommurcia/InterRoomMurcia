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
  pagado: boolean;
  fecha_pago: string | null;
  created_at: string;
};

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

export async function añadirGasto(operacionId: string, concepto: string, importe: number) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("operacion_gastos").insert({ operacion_id: operacionId, concepto, importe });
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
