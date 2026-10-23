import { NextRequest, NextResponse } from "next/server";
import {
  crearContrato,
  listarContratos,
  type DatosContratoExclusiva,
  type DatosContratoGestion,
  type TipoContrato,
} from "../../../../lib/contratos";

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

  const tipo = (body.tipo as TipoContrato | undefined) ?? "exclusiva_venta";
  if (tipo !== "exclusiva_venta" && tipo !== "gestion_alquiler") {
    return NextResponse.json({ error: "Tipo de contrato no soportado" }, { status: 400 });
  }

  // Validaciones comunes.
  const datos = body.datos as DatosContratoExclusiva | DatosContratoGestion;
  if (!datos.propietario?.nombre?.trim()) {
    return NextResponse.json({ error: "Falta el nombre del propietario" }, { status: 400 });
  }
  if (!datos.inmueble?.direccion?.trim()) {
    return NextResponse.json({ error: "Falta la dirección del inmueble" }, { status: 400 });
  }

  // Validación específica por tipo.
  if (tipo === "exclusiva_venta") {
    const d = datos as DatosContratoExclusiva;
    if (!d.precio_venta || d.precio_venta <= 0) {
      return NextResponse.json({ error: "Precio de venta inválido" }, { status: 400 });
    }
  } else {
    const d = datos as DatosContratoGestion;
    if (!d.renta_mensual || d.renta_mensual <= 0) {
      return NextResponse.json({ error: "Renta mensual inválida" }, { status: 400 });
    }
    if (d.modelo_comision === "manual" && !d.comision_texto?.trim()) {
      return NextResponse.json({ error: "Falta describir la comisión manual" }, { status: 400 });
    }
  }

  try {
    const c = await crearContrato({ tipo, cliente_id: body.cliente_id ?? null, datos });
    return NextResponse.json(c);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
