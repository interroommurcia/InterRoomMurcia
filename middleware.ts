import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ir_session";

function getJwtSecret() {
  const key = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!key) throw new Error("AUTH_SECRET o ADMIN_PASSWORD deben estar definidos");
  return new TextEncoder().encode(key);
}

function getClientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

async function logUnauthorized(req: NextRequest, reason: string) {
  const ip = getClientIp(req);
  const path = req.nextUrl.pathname;
  try {
    const { logSecurityEvent } = await import("./lib/security");
    await logSecurityEvent({
      type: reason === "jwt_tampered" ? "jwt_tampered" : "unauthorized_access",
      ip,
      path,
      details: reason,
    });
  } catch {
    console.error(`[security] ${reason} — IP: ${ip} — ${path}`);
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;

  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      logUnauthorized(req, "jwt_tampered");
    }
  } else {
    logUnauthorized(req, "no_token");
  }

  if (!req.nextUrl.pathname.startsWith("/api/")) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export const config = {
  matcher: ["/admin/((?!login).*)", "/api/admin/:path*"],
};
