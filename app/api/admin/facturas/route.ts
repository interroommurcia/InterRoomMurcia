import { NextRequest, NextResponse } from "next/server";
import { crearFactura, listarFacturas } from "../../../../lib/factura/facturas";
import type { LineaFactura } from "../../../../lib/factura/tipos";
import { actualizarCliente } from "../../../../lib/contabilidad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const clienteId = req.nextUrl.searchParams.get("clienteId") || undefined;
    return NextResponse.json(await listarFacturas(clienteId));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.numero || !body?.cliente_nombre || !Array.isArray(body?.lineas) || body.lineas.length === 0) {
    return NextResponse.json({ error: "numero, cliente_nombre y al menos una línea son requeridos" }, { status: 400 });
  }
  try {
    const lineas: LineaFactura[] = body.lineas.map((l: { descripcion?: string; base?: unknown }) => ({
      descripcion: String(l.descripcion ?? ""),
      base: Number(l.base) || 0,
    }));
    const factura = await crearFactura({
      numero: String(body.numero).trim(),
      cliente_id: body.cliente_id ?? null,
      origen: body.origen ?? "manual",
      origen_id: body.origen_id ?? null,
      fecha: String(body.fecha || new Date().toISOString().slice(0, 10)),
      concepto: String(body.concepto || "Servicios"),
      cliente_nombre: String(body.cliente_nombre),
      cliente_nif: body.cliente_nif ?? null,
      cliente_direccion: body.cliente_direccion ?? null,
      cliente_cp_ciudad: body.cliente_cp_ciudad ?? null,
      cliente_telefono: body.cliente_telefono ?? null,
      es_empresa: Boolean(body.es_empresa),
      iva_pct: body.iva_pct !== undefined ? Number(body.iva_pct) : undefined,
      irpf_pct: body.irpf_pct !== undefined ? Number(body.irpf_pct) : undefined,
      lineas,
    });
    // Persistimos los datos fiscales en la ficha del cliente para que la próxima
    // factura se autorrellene sola.
    if (body.cliente_id) {
      await actualizarCliente(body.cliente_id, {
        nif: body.cliente_nif || null,
        direccion: body.cliente_direccion || null,
        cp_ciudad: body.cliente_cp_ciudad || null,
        es_empresa: Boolean(body.es_empresa),
      }).catch(() => {});
    }
    return NextResponse.json(factura);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
