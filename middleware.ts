import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return new NextResponse("Backoffice no configurado: falta la variable ADMIN_PASSWORD", {
      status: 503,
    });
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    const separator = decoded.indexOf(":");
    const providedPassword = separator === -1 ? decoded : decoded.slice(separator + 1);
    if (providedPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Backoffice InterRoom"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
