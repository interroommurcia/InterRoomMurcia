import { NextRequest, NextResponse } from "next/server";
import { crearLead } from "../../../lib/leads";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const telefono = typeof body?.telefono === "string" ? body.telefono.trim().slice(0, 30) : "";
  const direccion = typeof body?.direccion === "string" ? body.direccion.trim().slice(0, 200) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 120) : "";
  const tipo = typeof body?.tipo === "string" ? body.tipo.trim().slice(0, 40) : "";
  const metros = Number.isFinite(Number(body?.metros)) && body?.metros !== "" ? Number(body.metros) : undefined;
  const precioDeseado =
    Number.isFinite(Number(body?.precioDeseado)) && body?.precioDeseado !== "" ? Number(body.precioDeseado) : undefined;
  const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim().slice(0, 500) : "";
  const origen = typeof body?.origen === "string" ? body.origen.trim().slice(0, 120) : "";

  if (!nombre || !telefono || !direccion) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  try {
    await crearLead({
      nombre,
      telefono,
      direccion,
      email,
      tipo,
      metros,
      precio_deseado: precioDeseado,
      mensaje,
      origen,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error guardando lead", err);
    return NextResponse.json({ error: "No se pudo guardar la solicitud" }, { status: 500 });
  }
}
