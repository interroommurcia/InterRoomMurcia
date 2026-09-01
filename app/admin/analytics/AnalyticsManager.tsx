"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

type PostHogData = {
  stats: { pageviews: number; visitors: number; sessions: number };
  bounceRate: number;
  totalNewUsers: number;
  topPages: { path: string; views: number; uniq: number }[];
  dailyViews: { day: string; pageviews: number; visitors: number }[];
  sources: { source: string; visits: number; visitors: number }[];
  devices: { device: string; visits: number; visitors: number }[];
  entryPages: { path: string; sessions: number }[];
  utmSources: { source: string; medium: string; visits: number; visitors: number }[];
  countries: { country: string; visits: number; visitors: number }[];
  realtime: { path: string; active: number }[];
  clicks: { element: string; clicks: number; users: number }[];
  newUsersDaily: { day: string; newUsers: number }[];
  referrers: { url: string; visits: number; visitors: number }[];
  peakConcurrentDaily: { day: string; peak: number }[];
  newVsReturn: { day: string; newUsers: number; returning: number }[];
};

type LeadsData = {
  total7d: number;
  total30d: number;
  byOrigen: { origen: string; count: number }[];
};

const MESES_NOMBRE = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Periodo = "7d" | "30d" | "mes" | "anio" | "custom";

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcRange(periodo: Periodo, mesVal: string, anioVal: number, customDesde: string, customHasta: string): { desde: string; hasta: string } | null {
  const now = new Date();
  if (periodo === "7d") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { desde: fmtDate(d), hasta: fmtDate(now) };
  }
  if (periodo === "30d") return null; // API default
  if (periodo === "mes") {
    const [y, m] = mesVal.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { desde: `${mesVal}-01`, hasta: `${mesVal}-${String(lastDay).padStart(2, "0")}` };
  }
  if (periodo === "anio") {
    return { desde: `${anioVal}-01-01`, hasta: `${anioVal}-12-31` };
  }
  if (periodo === "custom") {
    return { desde: customDesde, hasta: customHasta };
  }
  return null;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="analytics-bar-row">
      <span className="analytics-bar-label">{label}</span>
      <div className="analytics-bar-track">
        <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="analytics-bar-value">{value}</span>
    </div>
  );
}

type ReferrerGroup = { domain: string; total: number; urls: { url: string; visits: number }[] };

function groupReferrers(referrers: { url: string; visits: number }[]): ReferrerGroup[] {
  const map = new Map<string, ReferrerGroup>();
  for (const r of referrers) {
    let domain: string;
    try { domain = new URL(r.url).hostname.replace(/^www\./, ""); } catch { domain = r.url; }
    const g = map.get(domain);
    if (g) { g.total += r.visits; g.urls.push({ url: r.url, visits: r.visits }); }
    else map.set(domain, { domain, total: r.visits, urls: [{ url: r.url, visits: r.visits }] });
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function ReferrerCard({ referrers }: { referrers: { url: string; visits: number }[] }) {
  const groups = useMemo(() => groupReferrers(referrers), [referrers]);
  const [open, setOpen] = useState<string | null>(null);
  const maxVal = Math.max(1, ...groups.map((g) => g.total));

  if (groups.length === 0) return <p className="admin-empty">Sin datos.</p>;

  return (
    <div>
      {groups.map((g) => (
        <div key={g.domain}>
          <div
            className="analytics-bar-row"
            style={{ cursor: g.urls.length > 1 ? "pointer" : "default" }}
            onClick={() => g.urls.length > 1 && setOpen(open === g.domain ? null : g.domain)}
          >
            <span className="analytics-bar-label">
              {g.urls.length > 1 && <span style={{ marginRight: 4, fontSize: "0.7rem" }}>{open === g.domain ? "▼" : "▶"}</span>}
              {g.domain}
            </span>
            <div className="analytics-bar-track">
              <div className="analytics-bar-fill" style={{ width: `${Math.round((g.total / maxVal) * 100)}%` }} />
            </div>
            <span className="analytics-bar-value">{g.total}</span>
          </div>
          {open === g.domain && g.urls.map((u) => (
            <div key={u.url} className="analytics-bar-row analytics-bar-row--sub">
              <span className="analytics-bar-label" title={u.url}>
                {(() => { try { return new URL(u.url).pathname; } catch { return u.url; } })()}
              </span>
              <div className="analytics-bar-track">
                <div className="analytics-bar-fill analytics-bar-fill--sub" style={{ width: `${Math.round((u.visits / maxVal) * 100)}%` }} />
              </div>
              <span className="analytics-bar-value">{u.visits}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function periodoLabel(p: Periodo, mesVal: string, anioVal: number) {
  if (p === "7d") return "últimos 7 días";
  if (p === "30d") return "últimos 30 días";
  if (p === "mes") {
    const [y, m] = mesVal.split("-").map(Number);
    return `${MESES_NOMBRE[m - 1]} ${y}`;
  }
  if (p === "anio") return `Año ${anioVal}`;
  return "periodo personalizado";
}

const inputStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 };

export default function AnalyticsManager() {
  const [data, setData] = useState<PostHogData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadsData | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const now = new Date();
  const [mesVal, setMesVal] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [anioVal, setAnioVal] = useState(now.getFullYear());
  const [customDesde, setCustomDesde] = useState(fmtDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)));
  const [customHasta, setCustomHasta] = useState(fmtDate(now));

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    resumen: true,
    leads: true,
    audiencia: true,
    trafico: true,
    contenido: true,
  });

  const loadData = useCallback(() => {
    setLoading(true);
    const range = calcRange(periodo, mesVal, anioVal, customDesde, customHasta);
    const params = range ? `?desde=${range.desde}&hasta=${range.hasta}` : "";
    fetch(`/api/admin/posthog${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: "Error cargando analytics" }));
          setError(d.error || "Error cargando analytics");
          return;
        }
        setData(await res.json());
        setError("");
      })
      .catch(() => setError("Error de red cargando analytics"))
      .finally(() => setLoading(false));
  }, [periodo, mesVal, anioVal, customDesde, customHasta]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    fetch("/api/admin/leads-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setLeads(d))
      .catch(() => {});
  }, []);

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function SectionHead({ id, title }: { id: string; title: string }) {
    return (
      <div className="analytics-section-head" onClick={() => toggleSection(id)} style={{ cursor: "pointer" }}>
        <span style={{ fontSize: "0.75rem", marginRight: 6, opacity: 0.5 }}>{openSections[id] ? "▼" : "▶"}</span>
        <h2>{title}</h2>
      </div>
    );
  }

  const pLabel = periodoLabel(periodo, mesVal, anioVal);

  if (loading && !data) return <p className="admin-empty">Cargando analytics...</p>;
  if (error && !data) return <p className="lead-form-error">{error}</p>;
  if (!data) return null;

  const maxDaily = Math.max(1, ...data.dailyViews.map((d) => d.pageviews));
  const maxNewUsers = Math.max(1, ...data.newUsersDaily.map((d) => d.newUsers));
  const maxSource = Math.max(1, ...data.sources.map((s) => s.visits));
  const maxCountry = Math.max(1, ...data.countries.map((c) => c.visits));
  const peakAll = Math.max(0, ...data.peakConcurrentDaily.map((d) => d.peak));
  const maxPeak = Math.max(1, peakAll);
  const maxNvR = Math.max(1, ...data.newVsReturn.map((d) => d.newUsers + d.returning));
  const totalReturning = data.newVsReturn.reduce((s, d) => s + d.returning, 0);

  return (
    <div className="analytics-dashboard">
      {/* ── Selector de periodo ── */}
      <div className="analytics-periodo-bar">
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} style={inputStyle}>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="mes">Mes concreto</option>
          <option value="anio">Año completo</option>
          <option value="custom">Periodo personalizado</option>
        </select>
        {periodo === "mes" && (
          <input type="month" value={mesVal} onChange={(e) => setMesVal(e.target.value)} style={inputStyle} />
        )}
        {periodo === "anio" && (
          <select value={anioVal} onChange={(e) => setAnioVal(Number(e.target.value))} style={inputStyle}>
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
        {periodo === "custom" && (
          <>
            <input type="date" value={customDesde} onChange={(e) => setCustomDesde(e.target.value)} style={inputStyle} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>→</span>
            <input type="date" value={customHasta} onChange={(e) => setCustomHasta(e.target.value)} style={inputStyle} />
          </>
        )}
        {loading && <span style={{ fontSize: 12, color: "#9ca3af" }}>Cargando...</span>}
      </div>

      {/* ── En directo ── */}
      <div className="analytics-realtime-banner">
        <div className="analytics-realtime-dot" />
        <span className="analytics-realtime-count">
          {data.realtime.reduce((s, r) => s + r.active, 0)} {data.realtime.reduce((s, r) => s + r.active, 0) === 1 ? "usuario" : "usuarios"} ahora mismo
        </span>
        {data.realtime.length > 0 && (
          <span className="analytics-realtime-pages">
            {data.realtime.map((r) => `${r.path || "/"} (${r.active})`).join(" · ")}
          </span>
        )}
      </div>

      {/* ── Resumen ── */}
      <SectionHead id="resumen" title={`Resumen — ${pLabel}`} />
      {openSections.resumen && (
        <div className="analytics-stat-row">
          <div className="analytics-stat">
            <div className="analytics-stat-value">{data.stats.pageviews.toLocaleString()}</div>
            <div className="analytics-stat-label">Pageviews</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{data.stats.visitors.toLocaleString()}</div>
            <div className="analytics-stat-label">Visitantes</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{data.stats.sessions.toLocaleString()}</div>
            <div className="analytics-stat-label">Sesiones</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{data.bounceRate}%</div>
            <div className="analytics-stat-label">Tasa de rebote</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{data.totalNewUsers.toLocaleString()}</div>
            <div className="analytics-stat-label">Usuarios nuevos</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{totalReturning.toLocaleString()}</div>
            <div className="analytics-stat-label">Usuarios recurrentes</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{peakAll}</div>
            <div className="analytics-stat-label">Pico concurrentes/hora</div>
          </div>
        </div>
      )}

      {/* ── Leads ── */}
      {leads && (
        <>
          <SectionHead id="leads" title="Leads y conversión" />
          {openSections.leads && (
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Leads y conversión</h3>
                <div className="analytics-row"><span>Leads (7d)</span><span>{leads.total7d}</span></div>
                <div className="analytics-row"><span>Leads (30d)</span><span>{leads.total30d}</span></div>
                {data.stats.visitors > 0 && (
                  <div className="analytics-row">
                    <span>Conversión visitantes → lead</span>
                    <span>{((leads.total30d / data.stats.visitors) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className="analytics-card">
                <h3>Leads por origen (30d)</h3>
                {leads.byOrigen.length === 0 ? (
                  <p className="admin-empty">Sin leads todavía.</p>
                ) : (
                  leads.byOrigen.map((o) => (
                    <div key={o.origen} className="analytics-row"><span>{o.origen}</span><span>{o.count}</span></div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Audiencia ── */}
      <SectionHead id="audiencia" title="Audiencia" />
      {openSections.audiencia && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Nuevos vs recurrentes por día</h3>
            <div style={{ display: "flex", gap: 16, fontSize: 12, marginBottom: 8, color: "#6b7280" }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#22c55e", marginRight: 4 }} />Nuevos</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#6366f1", marginRight: 4 }} />Recurrentes</span>
            </div>
            <div className="analytics-daily-chart analytics-daily-chart--tall">
              {data.newVsReturn.map((d) => {
                const total = d.newUsers + d.returning;
                const pctNew = maxNvR > 0 ? Math.round((d.newUsers / maxNvR) * 100) : 0;
                const pctRet = maxNvR > 0 ? Math.round((d.returning / maxNvR) * 100) : 0;
                return (
                  <div key={d.day} className="analytics-daily-col">
                    <span className="analytics-daily-number">{total}</span>
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1 }}>
                      <div className="analytics-daily-bar" style={{ height: `${pctRet}%`, background: "#6366f1", borderRadius: "3px 3px 0 0", minHeight: d.returning > 0 ? 2 : 0 }} />
                      <div className="analytics-daily-bar analytics-daily-bar--new" style={{ height: `${pctNew}%`, borderRadius: d.returning > 0 ? "0" : "3px 3px 0 0", minHeight: d.newUsers > 0 ? 2 : 0 }} />
                    </div>
                    <span>{d.day.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-card">
            <h3>Usuarios nuevos por día</h3>
            <div className="analytics-daily-chart analytics-daily-chart--tall">
              {data.newUsersDaily.map((d) => (
                <div key={d.day} className="analytics-daily-col">
                  <span className="analytics-daily-number">{d.newUsers}</span>
                  <div className="analytics-daily-bar analytics-daily-bar--new" style={{ height: `${Math.round((d.newUsers / maxNewUsers) * 100)}%` }} />
                  <span>{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-card">
            <h3>Pageviews por día</h3>
            <div className="analytics-daily-chart analytics-daily-chart--tall">
              {data.dailyViews.map((d) => (
                <div key={d.day} className="analytics-daily-col">
                  <span className="analytics-daily-number">{d.pageviews}</span>
                  <div className="analytics-daily-bar" style={{ height: `${Math.round((d.pageviews / maxDaily) * 100)}%` }} />
                  <span>{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-card">
            <h3>Pico concurrentes por día</h3>
            <div className="analytics-daily-chart analytics-daily-chart--tall">
              {data.peakConcurrentDaily.map((d) => (
                <div key={d.day} className="analytics-daily-col">
                  <span className="analytics-daily-number">{d.peak}</span>
                  <div className="analytics-daily-bar analytics-daily-bar--peak" style={{ height: `${Math.round((d.peak / maxPeak) * 100)}%` }} />
                  <span>{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-card">
            <h3>Dispositivos</h3>
            {data.devices.map((d) => (
              <div key={d.device} className="analytics-row"><span>{d.device}</span><span>{d.visits}</span></div>
            ))}
          </div>

          <div className="analytics-card">
            <h3>Países</h3>
            {data.countries.map((c) => (
              <Bar key={c.country} label={c.country} value={c.visits} max={maxCountry} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tráfico ── */}
      <SectionHead id="trafico" title="Fuentes de tráfico" />
      {openSections.trafico && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Fuentes de tráfico</h3>
            {data.sources.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.sources.map((s) => <Bar key={s.source} label={s.source} value={s.visits} max={maxSource} />)
            )}
          </div>
          <div className="analytics-card">
            <h3>Referrers</h3>
            <ReferrerCard referrers={data.referrers} />
          </div>
          <div className="analytics-card">
            <h3>UTM</h3>
            {data.utmSources.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.utmSources.map((u) => (
                <div key={u.source + u.medium} className="analytics-row">
                  <span>{u.medium ? `${u.source} / ${u.medium}` : u.source}</span><span>{u.visits}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Contenido ── */}
      <SectionHead id="contenido" title="Contenido" />
      {openSections.contenido && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Páginas más vistas</h3>
            {data.topPages.map((p) => (
              <div key={p.path} className="analytics-row"><span>{p.path || "/"}</span><span>{p.views}</span></div>
            ))}
          </div>
          <div className="analytics-card">
            <h3>Páginas de entrada</h3>
            {data.entryPages.map((e) => (
              <div key={e.path} className="analytics-row"><span>{e.path || "/"}</span><span>{e.sessions}</span></div>
            ))}
          </div>
          <div className="analytics-card">
            <h3>Clicks en botones</h3>
            {data.clicks.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.clicks.map((c) => (
                <div key={c.element} className="analytics-row"><span>{c.element}</span><span>{c.clicks}</span></div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
