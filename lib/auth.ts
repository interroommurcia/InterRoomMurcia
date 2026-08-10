import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./supabaseAdmin";

export type Rol = "admin" | "comercial";

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

const COOKIE = "ir_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "interroom-fallback-key");

export async function crearSesion(user: SessionUser) {
  const token = await new SignJWT({ sub: user.id, email: user.email, nombre: user.nombre, rol: user.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

export async function getSesion(): Promise<SessionUser | null> {
  const cookie = (await cookies()).get(COOKIE);
  if (!cookie?.value) return null;
  try {
    const { payload } = await jwtVerify(cookie.value, SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      nombre: payload.nombre as string,
      rol: payload.rol as Rol,
    };
  } catch {
    return null;
  }
}

export async function verificarCredenciales(email: string, password: string): Promise<SessionUser | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("usuarios")
    .select("id, email, nombre, password_hash, rol, activo")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error || !data || !data.activo) return null;

  const { createHash } = await import("crypto");
  const hash = createHash("sha256").update(password).digest("hex");
  if (hash !== data.password_hash) return null;

  return { id: data.id, email: data.email, nombre: data.nombre, rol: data.rol };
}

export async function crearUsuario(email: string, password: string, nombre: string, rol: Rol = "comercial") {
  const { createHash } = await import("crypto");
  const hash = createHash("sha256").update(password).digest("hex");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("usuarios")
    .insert({ email: email.toLowerCase().trim(), password_hash: hash, nombre, rol })
    .select("id, email, nombre, rol")
    .single();
  if (error) throw error;
  return data;
}
