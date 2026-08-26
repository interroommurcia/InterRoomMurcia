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

function getJwtSecret() {
  const key = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!key) throw new Error("AUTH_SECRET o ADMIN_PASSWORD deben estar definidos en las variables de entorno");
  return new TextEncoder().encode(key);
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(email);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_ATTEMPTS;
}

export async function crearSesion(user: SessionUser) {
  const token = await new SignJWT({ sub: user.id, email: user.email, nombre: user.nombre, rol: user.rol })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getJwtSecret());

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
    const { payload } = await jwtVerify(cookie.value, getJwtSecret());
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
  const normalizedEmail = email.toLowerCase().trim();

  if (!checkRateLimit(normalizedEmail)) {
    return null;
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("usuarios")
    .select("id, email, nombre, password_hash, password_salt, rol, activo")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error || !data || !data.activo) return null;

  const { createHash } = await import("crypto");
  const salted = data.password_salt ? data.password_salt + password : password;
  const hash = createHash("sha256").update(salted).digest("hex");
  if (hash !== data.password_hash) return null;

  return { id: data.id, email: data.email, nombre: data.nombre, rol: data.rol };
}

export async function crearUsuario(email: string, password: string, nombre: string, rol: Rol = "comercial") {
  const { createHash, randomBytes } = await import("crypto");
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("usuarios")
    .insert({ email: email.toLowerCase().trim(), password_hash: hash, password_salt: salt, nombre, rol })
    .select("id, email, nombre, rol")
    .single();
  if (error) throw error;

  try {
    const { enviarEmailBienvenida } = await import("./email");
    const { SITE_URL } = await import("./site");
    await enviarEmailBienvenida(
      email.toLowerCase().trim(),
      nombre,
      rol as "admin" | "comercial",
      password,
      `${SITE_URL}/admin/login`,
    );
  } catch {
    // best-effort — user is created regardless
  }

  return data;
}

export async function generarTokenReset(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("usuarios")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("activo", true)
    .maybeSingle();

  if (!data) return null;

  const token = await new SignJWT({ sub: data.id, email: normalizedEmail, purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(getJwtSecret());

  return token;
}

export async function resetearPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.purpose !== "reset") return false;

    const { createHash, randomBytes } = await import("crypto");
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + newPassword).digest("hex");

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("usuarios")
      .update({ password_hash: hash, password_salt: salt })
      .eq("id", payload.sub as string);

    return !error;
  } catch {
    return false;
  }
}
