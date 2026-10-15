import { NextRequest, NextResponse } from "next/server";
import { crearLeadProximamente } from "../../../lib/leadsProximamente";
import { esBot } from "../../../lib/antispam";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.trim().slice(0, 30) : "";
  const piso_id = typeof body.piso_id === "string" ? body.piso_id.trim() : "";
  const piso_titulo = typeof body.piso_titulo === "string" ? body.piso_titulo.trim().slice(0, 200) : "";
  const piso_categoria = body.piso_categoria === "compraventa" ? "compraventa" : "alquiler";

  if (!telefono || !piso_id) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (esBot({ nombre, telefono })) {
    return NextResponse.json({ ok: true });
  }

  try {
    await crearLeadProximamente({ piso_id, piso_titulo, piso_categoria, nombre, telefono });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[leads-proximamente]", err);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}
