import { NextRequest, NextResponse } from "next/server";
import { listarPagosFacturables } from "../../../../../lib/factura/pendientes";
import { sugerirNumero } from "../../../../../lib/factura/numeracion";
import { getCliente } from "../../../../../lib/contabilidad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Devuelve, para un cliente, sus pagos pendientes de facturar, sus datos
// fiscales y el número de factura sugerido. Todo lo que necesita el formulario.
export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("clienteId");
  if (!clienteId) return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });
  try {
    const [cliente, pagos, numeroSugerido] = await Promise.all([
      getCliente(clienteId),
      listarPagosFacturables(clienteId),
      sugerirNumero(),
    ]);
    if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: `${cliente.nombre} ${cliente.apellidos ?? ""}`.trim(),
        nif: cliente.nif,
        direccion: cliente.direccion,
        cp_ciudad: cliente.cp_ciudad,
        telefono: cliente.telefono,
        es_empresa: cliente.es_empresa,
      },
      pagos,
      numeroSugerido,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
