"use client";

import { useEffect, useState, useCallback } from "react";

type SecurityEvent = {
  id: number;
  event_type: string;
  severity: string;
  ip: string | null;
  path: string | null;
  details: string | null;
  pais: string | null;
  region: string | null;
  ciudad: string | null;
  user_agent: string | null;
  created_at: string;
};

// Código ISO de país (alpha-2) → emoji de bandera.
function banderaDe(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// Clasifica el origen a partir del User-Agent: navegador real vs bot/herramienta.
function quienEs(ua: string | null): { etiqueta: string; esBot: boolean } {
  if (!ua) return { etiqueta: "Sin navegador (bot)", esBot: true };
  const u = ua.toLowerCase();
  if (/bot|crawl|spider|curl|wget|python|scan|http|scrapy|go-http|java\//.test(u)) return { etiqueta: "Bot / herramienta", esBot: true };
  if (/mobile|iphone|android/.test(u)) return { etiqueta: "Visitante (móvil)", esBot: false };
  if (/mozilla|chrome|safari|firefox|edg/.test(u)) return { etiqueta: "Visitante (navegador)", esBot: false };
  return { etiqueta: "Desconocido", esBot: true };
}

type Stats = {
  totalToday: number;
  highToday: number;
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

const EVENT_LABELS: Record<string, string> = {
  login_failed: "Login fallido",
  login_rate_limited: "Rate limit alcanzado",
  honeypot_triggered: "Honeypot (bot)",
  invalid_file_upload: "Archivo inválido",
  unauthorized_access: "Acceso no autorizado",
  suspicious_input: "Input sospechoso",
  jwt_tampered: "JWT manipulado",
  csrf_origin_mismatch: "CSRF detectado",
  admin_access: "Acceso exitoso",
};

export function SeguridadManager() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ totalToday: 0, highToday: 0 });
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter) params.set("severity", filter);
      const res = await fetch(`/api/admin/seguridad?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setStats(data.stats);
      }
    } catch {
      // silencioso
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "16px 24px", minWidth: 180 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totalToday}</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Eventos hoy</div>
        </div>
        <div style={{ background: stats.highToday > 0 ? "#fef2f2" : "#f1f5f9", borderRadius: 8, padding: "16px 24px", minWidth: 180 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats.highToday > 0 ? "#dc2626" : "#1e293b" }}>
            {stats.highToday}
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Alertas graves hoy</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["", "low", "medium", "high", "critical"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: filter === s ? "2px solid #ea6a12" : "1px solid #e2e8f0",
              background: filter === s ? "#fff7ed" : "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: filter === s ? 600 : 400,
            }}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "Todos"}
          </button>
        ))}
        <button
          onClick={fetchEvents}
          style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13 }}
        >
          Actualizar
        </button>
      </div>

      {loading && events.length === 0 ? (
        <p style={{ color: "#64748b" }}>Cargando...</p>
      ) : events.length === 0 ? (
        <p style={{ color: "#22c55e", fontWeight: 500 }}>Sin eventos de seguridad. Todo en orden.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "8px 12px" }}>Fecha</th>
                <th style={{ padding: "8px 12px" }}>Severidad</th>
                <th style={{ padding: "8px 12px" }}>Tipo</th>
                <th style={{ padding: "8px 12px" }}>IP</th>
                <th style={{ padding: "8px 12px" }}>Ubicación</th>
                <th style={{ padding: "8px 12px" }}>Quién</th>
                <th style={{ padding: "8px 12px" }}>Ruta</th>
                <th style={{ padding: "8px 12px" }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                    {new Date(ev.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        background: SEVERITY_COLORS[ev.severity] || "#94a3b8",
                      }}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px" }}>{EVENT_LABELS[ev.event_type] || ev.event_type}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{ev.ip || "—"}</td>
                  <td style={{ padding: "8px 12px", fontSize: 13, whiteSpace: "nowrap" }}>
                    {[ev.ciudad, ev.region, ev.pais].filter(Boolean).length
                      ? `${banderaDe(ev.pais)} ${[ev.ciudad, ev.region].filter(Boolean).join(", ") || ev.pais}`.trim()
                      : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: 12 }} title={ev.user_agent || ""}>
                    {(() => {
                      const q = quienEs(ev.user_agent);
                      return <span style={{ color: q.esBot ? "#64748b" : "#16a34a", fontWeight: 500 }}>{q.etiqueta}</span>;
                    })()}
                  </td>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{ev.path || "—"}</td>
                  <td style={{ padding: "8px 12px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ev.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
