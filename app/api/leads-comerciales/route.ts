import { NextRequest, NextResponse } from "next/server";
import { crearLeadComercial, type TipoLead } from "../../../lib/leadsComerciales";
import { esBot } from "../../../lib/antispam";
import { separarPrefijo, validarTelefono } from "../../../lib/telefono";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

  const tipo: TipoLead = body.tipo === "propietario" ? "propietario" : "estudiante";
  const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 160) : "";
  const telefonoRaw = typeof body.telefono === "string" ? body.telefono.trim().slice(0, 30) : "";
  const origen = typeof body.origen === "string" ? body.origen.trim().slice(0, 40) || "web" : "web";
  const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim().slice(0, 1000) || null : null;
  const consentimiento = body.consentimiento === true;

  if (!consentimiento) {
    return NextResponse.json({ error: "Debes aceptar recibir avisos para registrarte." }, { status: 400 });
  }

  const email = emailRaw || null;
  const telefono = telefonoRaw || null;

  if (!email && !telefono) {
    return NextResponse.json({ error: "Indica al menos un email o un teléfono." }, { status: 400 });
  }

  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "El email no tiene un formato válido." }, { status: 400 });
  }

  if (telefono) {
    const partes = separarPrefijo(telefono);
    const errorTel = partes
      ? validarTelefono(partes.prefijo, partes.digitos)
      : "El teléfono debe incluir un prefijo de país válido (ej. +34).";
    if (errorTel) return NextResponse.json({ error: errorTel }, { status: 400 });
  }

  if (esBot({ nombre, telefono: telefono ?? undefined, email: email ?? undefined })) {
    return NextResponse.json({ ok: true, filtered: true });
  }

  try {
    const id = await crearLeadComercial({ tipo, nombre, email, telefono, consentimiento, origen, mensaje });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[leads-comerciales/POST] ERROR al guardar:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo guardar" }, { status: 500 });
  }
}
