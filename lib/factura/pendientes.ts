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

// Devuelve todos los cobros de un cliente que aún no están cobrados, de las
// cuatro fuentes, normalizados con la base imponible ya sin IVA. Marca cuáles
// ya tienen una factura emitida (para avisar y no duplicar).
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
    if (r.cobrado) continue;
    out.push({
      origen: "ingreso",
      origen_id: r.id as string,
      fecha: (r.mes as string).slice(0, 10),
      concepto: `Comisión gestión alquiler — ${nombreMes(r.mes as string)}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      ya_facturado: yaFacturado("ingreso", r.id as string),
    });
  }
  for (const r of compraventas.data ?? []) {
    if (r.cobrado) continue;
    out.push({
      origen: "compraventa",
      origen_id: r.id as string,
      fecha: r.fecha_cierre as string,
      concepto: `Comisión intermediación compraventa — cierre ${r.fecha_cierre}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      ya_facturado: yaFacturado("compraventa", r.id as string),
    });
  }
  for (const r of alquilerComision.data ?? []) {
    if (r.cobrado) continue;
    out.push({
      origen: "alquiler_comision",
      origen_id: r.id as string,
      fecha: r.fecha as string,
      concepto: `Comisión intermediación alquiler — ${r.fecha}`,
      base: baseDesdeComisionConIva(Number(r.comision_calculada)),
      ya_facturado: yaFacturado("alquiler_comision", r.id as string),
    });
  }
  for (const r of creditos.data ?? []) {
    if (r.cobrado) continue;
    // En créditos el precio no lleva lógica de IVA: lo tratamos como base.
    out.push({
      origen: "credito",
      origen_id: r.id as string,
      fecha: r.fecha as string,
      concepto: `Compra de créditos — ${r.fecha}`,
      base: Math.round(Number(r.precio) * 100) / 100,
      ya_facturado: yaFacturado("credito", r.id as string),
    });
  }

  out.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return out;
}
