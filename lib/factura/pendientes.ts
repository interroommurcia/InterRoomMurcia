import { getSupabaseAdmin } from "../supabaseAdmin";
import { baseDesdeComisionConIva } from "./calculo";
import type { PagoFacturable } from "./tipos";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(fechaMes: string): string {
  const d = new Date(fechaMes);
  return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Devuelve todos los cobros de un cliente de las cuatro fuentes, normalizados
// con la base imponible ya sin IVA. Un pago sigue siendo "facturable" aunque
// esté cobrado — lo que lo descarta es tener ya una factura emitida: eso se
// marca con ya_facturado. El estado de cobro va en `cobrado` como info.
export async function listarPagosFacturables(clienteId: string): Promise<PagoFacturable[]> {
  const admin = getSupabaseAdmin();
  const [ingresos, compraventas, alquilerComision, creditos, facturas] = await Promise.all([
    admin.from("cliente_ingresos").select("id, mes, comision_calculada, cobrado").eq("cliente_id", clienteId),
    admin.from("operaciones_compraventa").select("id, fecha_cierre, comision_calculada, cobrado").eq("cliente_id", clienteId),
    admin.from("operaciones_alquiler_comision").select("id, fecha, comision_calculada, cobrado").eq("cliente_id", clienteId),
    admin.from("operaciones_creditos").select("id, fecha, precio, cobrado").eq("cliente_id", clienteId),
    admin.from("facturas").select("origen, origen_id").eq("cliente_id", clienteId),
  ]);

  const facturados = new Set(
    (facturas.data ?? []).map((f) => `${f.origen}:${f.origen_id}`)
  );
  const yaFacturado = (origen: string, id: string) => facturados.has(`${origen}:${id}`);

  const out: PagoFacturable[] = [];

  for (const r of ingresos.data ?? []) {
    out.push({
      origen: "ingreso",
      origen_id: r.id as string,
      fecha: (r.mes as string).slice(0, 10),
      concepto: `Comisión gestión alquiler — ${nombreMes(r.mes as string)}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("ingreso", r.id as string),
    });
  }
  for (const r of compraventas.data ?? []) {
    out.push({
      origen: "compraventa",
      origen_id: r.id as string,
      fecha: r.fecha_cierre as string,
      concepto: `Comisión intermediación compraventa — cierre ${r.fecha_cierre}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("compraventa", r.id as string),
    });
  }
  for (const r of alquilerComision.data ?? []) {
    out.push({
      origen: "alquiler_comision",
      origen_id: r.id as string,
      fecha: r.fecha as string,
      concepto: `Comisión intermediación alquiler — ${r.fecha}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("alquiler_comision", r.id as string),
    });
  }
  for (const r of creditos.data ?? []) {
    // En créditos el precio no lleva lógica de IVA: lo tratamos como base.
    out.push({
      origen: "credito",
      origen_id: r.id as string,
      fecha: r.fecha as string,
      concepto: `Compra de créditos — ${r.fecha}`,
      base: Math.round(Number(r.precio) * 100) / 100,
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("credito", r.id as string),
    });
  }

  out.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return out;
}

export type PagoFacturableConCliente = PagoFacturable & {
  cliente_id: string;
  cliente_nombre: string;
  cliente_nif: string | null;
  cliente_es_empresa: boolean;
};

// Devuelve todos los cobros pendientes de facturar de TODOS los clientes.
// Pensado para la vista de generación en lote desde /admin/facturas.
export async function listarPagosFacturablesTodos(): Promise<PagoFacturableConCliente[]> {
  const admin = getSupabaseAdmin();
  const [clientesRes, ingresos, compraventas, alquilerComision, creditos, facturas] = await Promise.all([
    admin.from("clientes").select("id, nombre, apellidos, nif, es_empresa"),
    admin.from("cliente_ingresos").select("id, cliente_id, mes, comision_calculada, cobrado"),
    admin.from("operaciones_compraventa").select("id, cliente_id, fecha_cierre, comision_calculada, cobrado"),
    admin.from("operaciones_alquiler_comision").select("id, cliente_id, fecha, comision_calculada, cobrado"),
    admin.from("operaciones_creditos").select("id, cliente_id, fecha, precio, cobrado"),
    admin.from("facturas").select("origen, origen_id"),
  ]);

  const facturados = new Set((facturas.data ?? []).map((f) => `${f.origen}:${f.origen_id}`));
  const yaFacturado = (origen: string, id: string) => facturados.has(`${origen}:${id}`);
  const clientesMap = new Map<string, { nombre: string; nif: string | null; es_empresa: boolean }>();
  for (const c of clientesRes.data ?? []) {
    clientesMap.set(c.id as string, {
      nombre: `${c.nombre} ${c.apellidos ?? ""}`.trim(),
      nif: (c.nif as string | null) ?? null,
      es_empresa: Boolean(c.es_empresa),
    });
  }

  const out: PagoFacturableConCliente[] = [];
  const push = (base: PagoFacturable, clienteId: string) => {
    const c = clientesMap.get(clienteId);
    if (!c) return;
    out.push({ ...base, cliente_id: clienteId, cliente_nombre: c.nombre, cliente_nif: c.nif, cliente_es_empresa: c.es_empresa });
  };

  for (const r of ingresos.data ?? []) {
    push({
      origen: "ingreso",
      origen_id: r.id as string,
      fecha: (r.mes as string).slice(0, 10),
      concepto: `Comisión gestión alquiler — ${nombreMes(r.mes as string)}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("ingreso", r.id as string),
    }, r.cliente_id as string);
  }
  for (const r of compraventas.data ?? []) {
    push({
      origen: "compraventa",
      origen_id: r.id as string,
      fecha: r.fecha_cierre as string,
      concepto: `Comisión intermediación compraventa — cierre ${r.fecha_cierre}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("compraventa", r.id as string),
    }, r.cliente_id as string);
  }
  for (const r of alquilerComision.data ?? []) {
    push({
      origen: "alquiler_comision",
      origen_id: r.id as string,
      fecha: r.fecha as string,
      concepto: `Comisión intermediación alquiler — ${r.fecha}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("alquiler_comision", r.id as string),
    }, r.cliente_id as string);
  }
  for (const r of creditos.data ?? []) {
    push({
      origen: "credito",
      origen_id: r.id as string,
      fecha: r.fecha as string,
      concepto: `Compra de créditos — ${r.fecha}`,
      base: Math.round(Number(r.precio) * 100) / 100,
      cobrado: Boolean(r.cobrado),
      ya_facturado: yaFacturado("credito", r.id as string),
    }, r.cliente_id as string);
  }

  out.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return out;
}
