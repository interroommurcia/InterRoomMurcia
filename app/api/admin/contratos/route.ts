import { NextRequest, NextResponse } from "next/server";
import { crearContrato, listarContratos, type DatosContratoExclusiva } from "../../../../lib/contratos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contratos = await listarContratos();
    return NextResponse.json(contratos);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.datos) {
    return NextResponse.json({ error: "Faltan datos del contrato" }, { status: 400 });
  }
  const datos = body.datos as DatosContratoExclusiva;
  if (!datos.propietario?.nombre?.trim()) {
    return NextResponse.json({ error: "Falta el nombre del propietario" }, { status: 400 });
  }
  if (!datos.inmueble?.direccion?.trim()) {
    return NextResponse.json({ error: "Falta la dirección del inmueble" }, { status: 400 });
  }
  try {
    const c = await crearContrato({ cliente_id: body.cliente_id ?? null, datos });
    return NextResponse.json(c);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
