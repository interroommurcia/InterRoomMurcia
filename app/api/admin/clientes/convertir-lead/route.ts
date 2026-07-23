import { NextRequest, NextResponse } from "next/server";
import { crearCliente } from "../../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.nombre || !body?.telefono || !body?.leadId) {
    return NextResponse.json({ error: "nombre, telefono y leadId son requeridos" }, { status: 400 });
  }
  try {
    const cliente = await crearCliente({
      nombre: body.nombre,
      telefono: body.telefono,
      email: body.email || undefined,
      tipo: "propietario",
      zona_interes: body.direccion || undefined,
      operacion: "alquiler",
      origen: "lead",
      lead_id: body.leadId,
    });
    return NextResponse.json(cliente);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
