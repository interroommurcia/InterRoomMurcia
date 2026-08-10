import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ir_session";

function getJwtSecret() {
  const key = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!key) throw new Error("AUTH_SECRET o ADMIN_PASSWORD deben estar definidos");
  return new TextEncoder().encode(key);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;

  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      // token inválido/expirado
    }
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
