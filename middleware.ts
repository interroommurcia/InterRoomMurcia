import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ir_session";

// Rutas accesibles ÚNICAMENTE para rol "admin". El rol "comercial", aunque esté
// correctamente logueado, debe recibir 403 (API) o redirect a /admin (pagina).
// Si una página admin-only tiene su API en /api/admin/<x>, añade ambos aquí.
const ADMIN_ONLY_PREFIXES = [
  // Páginas
  "/admin/contabilidad",
  "/admin/facturas",
  "/admin/articulos",
  "/admin/analytics",
  "/admin/seguridad",
  "/admin/usuarios",
  // APIs sensibles (contabilidad y facturación completas)
  "/api/admin/contabilidad",
  "/api/admin/facturas",
  "/api/admin/articulos",
  "/api/admin/analytics",
  "/api/admin/ingresos",
  "/api/admin/cliente-gastos",
  "/api/admin/gastos-fijos",
  "/api/admin/gastos-empresa",
  "/api/admin/liquidaciones",
  "/api/admin/alquiler-comisiones",
  "/api/admin/creditos",
  "/api/admin/operaciones",
  "/api/admin/documentos",
  "/api/admin/factura-config",
  "/api/admin/seguridad",
  "/api/admin/usuarios",
];

function esAdminOnly(path: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
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

      // Check rol para rutas admin-only. Un comercial logueado NO puede entrar.
      if (esAdminOnly(path) && rol !== "admin") {
        logUnauthorized(req, `rol_insuficiente:${rol ?? "sin_rol"}`);
        if (!path.startsWith("/api/")) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        return NextResponse.json({ error: "Acceso restringido a administradores" }, { status: 403 });
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
