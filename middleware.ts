import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ir_session";

// Rutas restringidas y qué roles pueden entrar (además de "admin", que siempre
// puede). Un rol logueado que no esté en la lista recibe 403 (API) o redirect
// a /admin (página). Si una página restringida tiene su API en /api/admin/<x>,
// añade ambos prefijos con los mismos roles.
//   direccion → Contabilidad, Facturas, Artículos (no Analytics/Seguridad/Usuarios).
//   comercial → solo lo no listado aquí.
const PREFIJOS_RESTRINGIDOS: { prefix: string; roles: string[] }[] = [
  // Contabilidad (páginas + APIs sensibles)
  { prefix: "/admin/contabilidad", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/contabilidad", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/ingresos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/cliente-gastos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/gastos-fijos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/gastos-empresa", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/liquidaciones", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/alquiler-comisiones", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/creditos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/operaciones", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/documentos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/factura-config", roles: ["admin", "direccion"] },
  // Facturas
  { prefix: "/admin/facturas", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/facturas", roles: ["admin", "direccion"] },
  // Artículos
  { prefix: "/admin/articulos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/articulos", roles: ["admin", "direccion"] },
  { prefix: "/api/admin/blog-stats", roles: ["admin", "direccion"] },
  // Solo admin
  { prefix: "/admin/analytics", roles: ["admin"] },
  { prefix: "/api/admin/analytics", roles: ["admin"] },
  { prefix: "/admin/seguridad", roles: ["admin"] },
  { prefix: "/api/admin/seguridad", roles: ["admin"] },
  { prefix: "/admin/usuarios", roles: ["admin"] },
  { prefix: "/api/admin/usuarios", roles: ["admin"] },
];

// Roles permitidos para una ruta, o null si no está restringida.
function rolesPermitidos(path: string): string[] | null {
  const m = PREFIJOS_RESTRINGIDOS.find((p) => path === p.prefix || path.startsWith(p.prefix + "/"));
  return m ? m.roles : null;
}

function getJwtSecret() {
  const key = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!key) throw new Error("AUTH_SECRET o ADMIN_PASSWORD deben estar definidos");
  return new TextEncoder().encode(key);
}

function getClientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

// IPs locales: es el propio desarrollo/servidor, no un externo. No las tratamos como amenaza.
function esLocal(ip: string | null): boolean {
  return ip === "::1" || ip === "127.0.0.1" || ip === "localhost" || ip === null;
}

// Geolocalización del visitante a partir de las cabeceras edge de Vercel.
function getGeo(req: NextRequest) {
  const dec = (v: string | null) => (v ? decodeURIComponent(v) : null);
  return {
    pais: req.headers.get("x-vercel-ip-country"),
    region: dec(req.headers.get("x-vercel-ip-country-region")),
    ciudad: dec(req.headers.get("x-vercel-ip-city")),
    userAgent: req.headers.get("user-agent"),
  };
}

async function logAuthorized(req: NextRequest) {
  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;
  try {
    const { logSecurityEvent } = await import("./lib/security");
    await logSecurityEvent({ type: "admin_access", ip, path, details: "ok", ...getGeo(req) });
  } catch {
    // silencioso
  }
}

async function logUnauthorized(req: NextRequest, reason: string) {
  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;

  // "Soy yo": acceso local sin sesión (dev/servidor). No se registra como incidencia.
  if (reason === "no_token" && esLocal(ip)) return;

  try {
    const { logSecurityEvent } = await import("./lib/security");
    const esTampered = reason === "jwt_tampered";
    // Un no_token es un bot/anónimo llamando a una puerta cerrada: se registra pero
    // en "low" y sin aviso. Rol insuficiente (usuario logueado) y JWT manipulado sí avisan.
    const severity = esTampered ? "critical" : reason === "no_token" ? "low" : "high";
    await logSecurityEvent({
      type: esTampered ? "jwt_tampered" : "unauthorized_access",
      ip,
      path,
      details: reason,
      severity,
      notify: severity !== "low",
      ...getGeo(req),
    });
  } catch {
    console.error(`[security] ${reason} — IP: ${ip} — ${path}`);
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  const path = req.nextUrl.pathname;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      const rol = typeof payload.rol === "string" ? payload.rol : null;

      // Check rol para rutas restringidas. Un rol sin permiso NO puede entrar.
      const permitidos = rolesPermitidos(path);
      if (permitidos && (!rol || !permitidos.includes(rol))) {
        logUnauthorized(req, `rol_insuficiente:${rol ?? "sin_rol"}`);
        if (!path.startsWith("/api/")) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
      }

      logAuthorized(req);
      return NextResponse.next();
    } catch {
      logUnauthorized(req, "jwt_tampered");
    }
  } else {
    logUnauthorized(req, "no_token");
  }

  if (!path.startsWith("/api/")) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export const config = {
  matcher: ["/admin/((?!login).*)", "/api/admin/:path*"],
};
