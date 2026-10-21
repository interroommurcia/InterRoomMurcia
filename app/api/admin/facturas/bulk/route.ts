import { NextRequest, NextResponse } from "next/server";
import { crearFactura } from "../../../../../lib/factura/facturas";
import { sugerirSiguiente } from "../../../../../lib/factura/numeracion";
import { getCliente, actualizarCliente } from "../../../../../lib/contabilidad";
import { listarPagosFacturablesTodos } from "../../../../../lib/factura/pendientes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Entrada = { origen: string; origen_id: string; cliente_id: string };

// Genera N facturas en lote, numerándolas secuencialmente a partir de
// numero_inicial. Si falla alguna, devuelve el detalle para que la UI avise.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const entradas: Entrada[] = Array.isArray(body?.pagos) ? body.pagos : [];
  const numeroInicial = typeof body?.numero_inicial === "string" ? body.numero_inicial.trim() : "";
  if (!entradas.length) return NextResponse.json({ error: "pagos vacío" }, { status: 400 });
  if (!numeroInicial) return NextResponse.json({ error: "numero_inicial requerido" }, { status: 400 });

  const todos = await listarPagosFacturablesTodos();
  const map = new Map(todos.map((p) => [`${p.origen}:${p.origen_id}`, p]));

  const generadas: { numero: string; factura_id: string; cliente_nombre: string }[] = [];
  const errores: { origen: string; origen_id: string; error: string }[] = [];
  let numero = numeroInicial;

  for (const e of entradas) {
    const pago = map.get(`${e.origen}:${e.origen_id}`);
    if (!pago) {
      errores.push({ origen: e.origen, origen_id: e.origen_id, error: "Pago no encontrado o ya facturado" });
      continue;
    }
    if (pago.ya_facturado) {
      errores.push({ origen: e.origen, origen_id: e.origen_id, error: "Ya tenía factura emitida" });
      continue;
    }
    const cliente = await getCliente(pago.cliente_id);
    if (!cliente) {
      errores.push({ origen: e.origen, origen_id: e.origen_id, error: "Cliente no encontrado" });
      continue;
    }
    if (!cliente.nif) {
      errores.push({ origen: e.origen, origen_id: e.origen_id, error: `${pago.cliente_nombre}: falta NIF/CIF` });
      continue;
    }
    try {
      const factura = await crearFactura({
        numero,
        cliente_id: cliente.id,
        origen: pago.origen,
        origen_id: pago.origen_id,
        fecha: pago.fecha,
        concepto: pago.concepto.split(" — ")[0],
        cliente_nombre: `${cliente.nombre} ${cliente.apellidos ?? ""}`.trim(),
        cliente_nif: cliente.nif,
        cliente_direccion: cliente.direccion,
        cliente_cp_ciudad: cliente.cp_ciudad,
        cliente_telefono: cliente.telefono,
        es_empresa: cliente.es_empresa,
        iva_pct: 21,
        irpf_pct: cliente.es_empresa ? 15 : 0,
        lineas: [{ descripcion: pago.concepto, base: pago.base }],
      });
      await actualizarCliente(cliente.id, {
        nif: cliente.nif,
        direccion: cliente.direccion,
        cp_ciudad: cliente.cp_ciudad,
        es_empresa: cliente.es_empresa,
      }).catch(() => {});
      generadas.push({ numero, factura_id: factura.id, cliente_nombre: pago.cliente_nombre });
      numero = sugerirSiguiente(numero);
    } catch (err: unknown) {
      errores.push({ origen: e.origen, origen_id: e.origen_id, error: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  return NextResponse.json({ generadas, errores });
}
