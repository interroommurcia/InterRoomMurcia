import { getSupabaseAdmin } from "./supabaseAdmin";

export type SecurityEventType =
  | "login_failed"
  | "login_rate_limited"
  | "honeypot_triggered"
  | "invalid_file_upload"
  | "unauthorized_access"
  | "suspicious_input"
  | "jwt_tampered"
  | "csrf_origin_mismatch"
  | "admin_access";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

const SEVERITY_MAP: Record<SecurityEventType, SecuritySeverity> = {
  login_failed: "low",
  login_rate_limited: "high",
  honeypot_triggered: "medium",
  invalid_file_upload: "medium",
  unauthorized_access: "high",
  suspicious_input: "medium",
  jwt_tampered: "critical",
  csrf_origin_mismatch: "high",
  admin_access: "low",
};

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

let tableChecked = false;

async function ensureTable() {
  if (tableChecked) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("security_events").select("id").limit(1);
  if (error?.code === "42P01") {
    console.warn("[security] Tabla security_events no existe. Créala con el SQL del README.");
  }
  tableChecked = true;
}

export async function logSecurityEvent(params: {
  type: SecurityEventType;
  ip?: string | null;
  path?: string;
  details?: string;
}) {
  const severity = SEVERITY_MAP[params.type];

  try {
    await ensureTable();
    const admin = getSupabaseAdmin();
    await admin.from("security_events").insert({
      event_type: params.type,
      severity,
      ip: params.ip || null,
      path: params.path || null,
      details: params.details?.slice(0, 500) || null,
    });
  } catch (e) {
    console.error("[security] Error guardando evento:", e);
  }

  if (
    (severity === "high" || severity === "critical") &&
    TELEGRAM_CHAT_ID
  ) {
    sendTelegramAlert(params.type, severity, params.ip, params.path, params.details).catch((e) =>
      console.error("[security] Error enviando alerta Telegram:", e)
    );
  }
}

async function sendTelegramAlert(
  type: SecurityEventType,
  severity: SecuritySeverity,
  ip?: string | null,
  path?: string,
  details?: string
) {
  const icon = severity === "critical" ? "🚨" : "⚠️";
  const text = [
    `${icon} ALERTA SEGURIDAD — ${severity.toUpperCase()}`,
    `Tipo: ${type}`,
    ip ? `IP: ${ip}` : null,
    path ? `Ruta: ${path}` : null,
    details ? `Detalle: ${details}` : null,
    `Hora: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const { telegramSendMessage } = await import("./telegram");
  await telegramSendMessage(TELEGRAM_CHAT_ID!, text);
}

export function getClientIp(req: Request): string | null {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(s: string): boolean {
  return DATE_RE.test(s);
}
