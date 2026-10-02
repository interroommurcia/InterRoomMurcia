import { NextRequest, NextResponse } from "next/server";
import { crearLead } from "../../../lib/leads";
import { logSecurityEvent, getClientIp } from "../../../lib/security";

const ipRequests = new Map<string, { count: number; resetAt: number }>();
const LEAD_LIMIT = 10;
const LEAD_WINDOW = 60 * 60 * 1000;

function checkLeadRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + LEAD_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= LEAD_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || "unknown";

  if (!checkLeadRate(ip)) {
    logSecurityEvent({ type: "login_rate_limited", ip, path: "/api/leads", details: "Rate limited leads" }).catch(() => {});
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

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
  const seccion = typeof body?.seccion === "string" ? body.seccion.trim().slice(0, 40) : "";

  if (body?.website) {
    logSecurityEvent({ type: "honeypot_triggered", ip, path: "/api/leads", details: `Bot: ${nombre}` }).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (!nombre || !telefono || (!direccion && seccion !== "inversores")) {
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
      seccion: seccion || "propietarios",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error guardando lead", err);
    return NextResponse.json({ error: "No se pudo guardar la solicitud" }, { status: 500 });
  }
}
