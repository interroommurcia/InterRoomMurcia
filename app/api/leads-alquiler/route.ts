import { NextRequest, NextResponse } from "next/server";
import { crearLeadAlquiler } from "../../../lib/leadsAlquiler";
import { esBot } from "../../../lib/antispam";
import { separarPrefijo, validarTelefono } from "../../../lib/telefono";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.trim().slice(0, 30) : "";
  const piso_id = typeof body.piso_id === "string" ? body.piso_id.trim() : "";
  const piso_titulo = typeof body.piso_titulo === "string" ? body.piso_titulo.trim().slice(0, 200) : "";
  const piso_categoria = body.piso_categoria === "compraventa" ? "compraventa" : "alquiler";
  const tipo_interes = body.tipo_interes === "grupo" ? "grupo" : "individual";
  const grupo_tam = tipo_interes === "grupo" && Number.isFinite(Number(body.grupo_tam))
    ? Math.max(1, Math.min(50, Math.round(Number(body.grupo_tam))))
    : null;
  const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim().slice(0, 1000) || null : null;

  if (!telefono || !piso_id) {
    return NextResponse.json({ error: "Faltan teléfono o piso_id" }, { status: 400 });
  }

  // Validación del teléfono por prefijo: no deja pasar un número con dígitos de
  // menos o de más aunque se salte la comprobación del navegador.
  const partes = separarPrefijo(telefono);
  const errorTel = partes
    ? validarTelefono(partes.prefijo, partes.digitos)
    : "El teléfono debe incluir un prefijo de país válido (ej. +34).";
  if (errorTel) {
    return NextResponse.json({ error: errorTel }, { status: 400 });
  }

  if (esBot({ nombre, telefono })) {
    return NextResponse.json({ ok: true, filtered: true });
  }

  try {
    const id = await crearLeadAlquiler({ piso_id, piso_titulo, piso_categoria, nombre, telefono, tipo_interes, grupo_tam, mensaje });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[leads-alquiler/POST] ERROR al guardar:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo guardar" }, { status: 500 });
  }
}
