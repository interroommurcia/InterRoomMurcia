import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "ir_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "interroom-fallback-key");

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;

  if (token) {
    try {
      await jwtVerify(token, SECRET);
      return NextResponse.next();
    } catch {
      // token inválido/expirado — redirigir a login
    }
  }

  // Fallback: HTTP Basic Auth para no romper accesos actuales
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
      const separator = decoded.indexOf(":");
      const providedPassword = separator === -1 ? decoded : decoded.slice(separator + 1);
      if (providedPassword === password) {
        return NextResponse.next();
      }
    }
  }

  // Redirigir a login si es una página (no API)
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
