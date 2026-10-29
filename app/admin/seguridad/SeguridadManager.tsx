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

  const FILTROS: { v: string; label: string }[] = [
    { v: "", label: "ALL" },
    { v: "low", label: "LOW" },
    { v: "medium", label: "MED" },
    { v: "high", label: "HIGH" },
    { v: "critical", label: "CRIT" },
  ];

  return (
    <div className="seg-console">
      <div className="seg-topbar">
        <span className="seg-dots">
          <span className="seg-dot seg-dot--r" />
          <span className="seg-dot seg-dot--y" />
          <span className="seg-dot seg-dot--g" />
        </span>
        <span className="seg-prompt">
          <b>root@interroom</b>:~/seguridad# tail -f threats.log<span className="seg-cursor" />
        </span>
        <span className="seg-live">
          <span className="seg-live-dot" />
          Monitoring
        </span>
      </div>

      <div className="seg-body">
        <div className="seg-stats">
          <div className="seg-stat">
            <div className={`seg-stat-value${stats.totalToday === 0 ? " is-zero" : ""}`}>
              {String(stats.totalToday).padStart(2, "0")}
            </div>
            <div className="seg-stat-label">Eventos / 24h</div>
          </div>
          <div className={`seg-stat${stats.highToday > 0 ? " seg-stat--alert" : ""}`}>
            <div className={`seg-stat-value${stats.highToday === 0 ? " is-zero" : ""}`}>
              {String(stats.highToday).padStart(2, "0")}
            </div>
            <div className="seg-stat-label">Amenazas graves</div>
          </div>
          <div className="seg-stat">
            <div className={`seg-stat-value${events.length === 0 ? " is-zero" : ""}`} style={{ color: stats.highToday > 0 ? "var(--seg-red)" : undefined }}>
              {stats.highToday > 0 ? "ALERTA" : "SEGURO"}
            </div>
            <div className="seg-stat-label">Estado del sistema</div>
          </div>
        </div>

        <div className="seg-filters">
          {FILTROS.map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`seg-chip${filter === f.v ? " is-active" : ""}`}>
              {f.label}
            </button>
          ))}
          <button onClick={fetchEvents} className="seg-chip seg-refresh">↻ refresh</button>
        </div>

        {loading && events.length === 0 ? (
          <p className="seg-loading">&gt; escaneando registros…</p>
        ) : events.length === 0 ? (
          <p className="seg-empty">&gt; 0 amenazas detectadas. Perímetro asegurado. ✓</p>
        ) : (
          <div className="seg-table-wrap">
            <table className="seg-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Nivel</th>
                  <th>Vector</th>
                  <th>IP origen</th>
                  <th>Geolocalización</th>
                  <th>Agente</th>
                  <th>Ruta</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const q = quienEs(ev.user_agent);
                  return (
                    <tr key={ev.id}>
                      <td className="seg-mono" style={{ whiteSpace: "nowrap" }}>
                        {new Date(ev.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>
                        <span className={`seg-badge seg-badge--${ev.severity}`}>{ev.severity}</span>
                      </td>
                      <td>{EVENT_LABELS[ev.event_type] || ev.event_type}</td>
                      <td className="seg-mono">{ev.ip || "—"}</td>
                      <td className="seg-mono" style={{ whiteSpace: "nowrap" }}>
                        {[ev.ciudad, ev.region, ev.pais].filter(Boolean).length
                          ? `${banderaDe(ev.pais)} ${[ev.ciudad, ev.region].filter(Boolean).join(", ") || ev.pais}`.trim()
                          : "—"}
                      </td>
                      <td title={ev.user_agent || ""}>
                        <span className={q.esBot ? "seg-who-bot" : "seg-who-ok"}>{q.etiqueta}</span>
                      </td>
                      <td className="seg-mono seg-dimtext">{ev.path || "—"}</td>
                      <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }} className="seg-dimtext">
                        {ev.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
