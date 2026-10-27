"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import BotonInterno from "../../../components/BotonInterno";

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
  avgSessionDuration: number;
  avgPagesPerSession: number;
  venta?: {
    pageviews: number;
    visitors: number;
    step1: number;
    submits: number;
    waClicks: number;
    calcUses: number;
    scroll: { depth: number; hits: number; users: number }[];
    exitIntent: {
      shown: number;
      closed: number;
      submitted: number;
      uniqueShown: number;
      dwell10s: number;
      abandoned: number;
      abandonedAfter10s: number;
      avgCloseMs: number;
      nextPages: { page: string; visits: number }[];
    };
    convBySource: { source: string; conversions: number; users: number }[];
    calc: { avgPrecio: number; medianPrecio: number; avgAhorro: number; uses: number };
  };
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

function HelpTip({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Calcula posición del bubble en viewport cada vez que abre o se hace scroll/resize.
  useEffect(() => {
    if (!open) return;
    function recompute() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bubbleW = Math.min(280, vw - 24);
      const bubbleH = bubbleRef.current?.offsetHeight ?? 80;
      const spaceAbove = rect.top;
      const spaceBelow = vh - rect.bottom;
      const placement: "top" | "bottom" = spaceAbove > bubbleH + 16 ? "top" : spaceBelow > bubbleH + 16 ? "bottom" : "top";
      const top = placement === "top" ? rect.top - 8 : rect.bottom + 8;
      let left = rect.left + rect.width / 2;
      // Clamp horizontalmente al viewport con margen de 12px.
      const half = bubbleW / 2;
      if (left - half < 12) left = half + 12;
      if (left + half > vw - 12) left = vw - 12 - half;
      setPos({ top, left, placement });
    }
    recompute();
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    function onDoc(e: MouseEvent | TouchEvent) {
      if (!ref.current?.contains(e.target as Node) && !bubbleRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`analytics-help-tip${open ? " is-open" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={tip}
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }
        if (e.key === "Escape") setOpen(false);
      }}
    >
      ?
      {open && mounted && pos &&
        createPortal(
          <div
            ref={bubbleRef}
            className={`analytics-help-tip-portal analytics-help-tip-portal--${pos.placement}`}
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
          >
            {tip}
          </div>,
          document.body,
        )}
    </span>
  );
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
  const [excluirAdmin, setExcluirAdmin] = useState(true);
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
    estrategia: true,
  });

  const loadData = useCallback(() => {
    setLoading(true);
    const range = calcRange(periodo, mesVal, anioVal, customDesde, customHasta);
    const qs = new URLSearchParams();
    if (range) { qs.set("desde", range.desde); qs.set("hasta", range.hasta); }
    if (excluirAdmin) qs.set("excluirAdmin", "1");
    const params = qs.toString() ? `?${qs}` : "";
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
  }, [periodo, mesVal, anioVal, customDesde, customHasta, excluirAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // En móvil, cuando llegan los datos, los gráficos diarios se auto-desplazan
  // al último día para que no quede escondido fuera del viewport.
  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const t = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".analytics-daily-chart").forEach((el) => {
        el.scrollLeft = el.scrollWidth;
      });
    }, 50);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    fetch("/api/admin/leads-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setLeads(d))
      .catch(() => {});
  }, []);

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function SectionHead({ id, title, tip }: { id: string; title: string; tip?: string }) {
    return (
      <div className="analytics-section-head" onClick={() => toggleSection(id)} style={{ cursor: "pointer" }}>
        <span style={{ fontSize: "0.75rem", marginRight: 6, opacity: 0.5 }}>{openSections[id] ? "▼" : "▶"}</span>
        <h2>{title}</h2>
        {tip && <HelpTip tip={tip} />}
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
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", marginLeft: "auto" }}>
          <input type="checkbox" checked={excluirAdmin} onChange={(e) => setExcluirAdmin(e.target.checked)} />
          Excluir mis visitas (admin)
        </label>
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
      <SectionHead id="resumen" title={`Resumen — ${pLabel}`} tip="Métricas clave del rendimiento de tu web en el periodo seleccionado" />
      {openSections.resumen && (
        <div className="analytics-stat-row">
          {[
            { value: data.stats.pageviews.toLocaleString(), label: "Pageviews", tip: "Total de páginas vistas en el periodo seleccionado" },
            { value: data.stats.visitors.toLocaleString(), label: "Visitantes", tip: "Usuarios únicos que visitaron la web" },
            { value: data.stats.sessions.toLocaleString(), label: "Sesiones", tip: "Número de sesiones de navegación (un usuario puede tener varias)" },
            { value: `${data.bounceRate}%`, label: "Tasa de rebote", tip: "Porcentaje de sesiones en las que el usuario solo vio una página y se fue" },
            { value: data.totalNewUsers.toLocaleString(), label: "Usuarios nuevos", tip: "Usuarios que visitaron la web por primera vez en este periodo" },
            { value: totalReturning.toLocaleString(), label: "Usuarios recurrentes", tip: "Usuarios que ya habían visitado la web antes de este periodo" },
            { value: String(peakAll), label: "Pico concurrentes/hora", tip: "Máximo de usuarios únicos activos en la misma hora durante el periodo" },
            { value: data.avgSessionDuration >= 60 ? `${Math.floor(data.avgSessionDuration / 60)}m ${data.avgSessionDuration % 60}s` : `${data.avgSessionDuration}s`, label: "Tiempo medio visita", tip: "Duración media de las sesiones con más de una página vista" },
            { value: String(data.avgPagesPerSession), label: "Páginas / sesión", tip: "Media de páginas vistas por sesión (solo sesiones con más de 1 página)" },
          ].map((s) => (
            <div className="analytics-stat" key={s.label}>
              <div className="analytics-stat-value">{s.value}</div>
              <div className="analytics-stat-label">
                {s.label}
                <HelpTip tip={s.tip} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Leads ── */}
      {leads && (
        <>
          <SectionHead id="leads" title="Leads y conversión" tip="Formularios de contacto recibidos y tasa de conversión de visitantes a leads" />
          {openSections.leads && (
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Leads y conversión <HelpTip tip="Formularios de contacto enviados por visitantes interesados en alquilar" /></h3>
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
                <h3>Leads por origen (30d) <HelpTip tip="Desde qué canal llegaron los leads: web, WhatsApp, redes sociales, etc." /></h3>
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
      <SectionHead id="audiencia" title="Audiencia" tip="Quiénes son tus visitantes: nuevos vs recurrentes, dispositivos, países y tendencias diarias" />
      {openSections.audiencia && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Nuevos vs recurrentes por día <HelpTip tip="Comparativa diaria entre usuarios que visitan por primera vez y los que ya habían visitado antes" /></h3>
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
            <h3>Usuarios nuevos por día <HelpTip tip="Número de personas que visitan la web por primera vez cada día" /></h3>
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
            <h3>Pageviews por día <HelpTip tip="Total de páginas cargadas por día. Un usuario puede generar varias pageviews en una sesión" /></h3>
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
            <h3>Pico concurrentes por día <HelpTip tip="Máximo de usuarios activos al mismo tiempo en una hora, para cada día del periodo" /></h3>
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
            <h3>Dispositivos <HelpTip tip="Tipo de dispositivo usado: móvil, escritorio o tablet" /></h3>
            {data.devices.map((d) => (
              <div key={d.device} className="analytics-row"><span>{d.device}</span><span>{d.visits}</span></div>
            ))}
          </div>

          <div className="analytics-card">
            <h3>Países <HelpTip tip="País desde el que acceden los visitantes, basado en su dirección IP" /></h3>
            {data.countries.map((c) => (
              <Bar key={c.country} label={c.country} value={c.visits} max={maxCountry} />
            ))}
          </div>
        </div>
      )}

      {/* ── De dónde vienen ── */}
      <SectionHead id="trafico" title="De dónde vienen" tip="Canales y webs que traen visitantes: buscadores, redes sociales, campañas y referrers" />
      {openSections.trafico && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Origen del tráfico <HelpTip tip="Fuente desde la que los usuarios llegan a tu web: buscadores (Google), directo (escriben la URL), redes sociales, etc." /></h3>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>Google, directo, redes sociales…</p>
            {data.sources.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.sources.map((s) => <Bar key={s.source} label={s.source === "(directo)" ? "Directo (escriben la URL)" : s.source} value={s.visits} max={maxSource} />)
            )}
          </div>
          <div className="analytics-card">
            <h3>Webs que nos enlazan <HelpTip tip="Páginas externas con un enlace a tu web desde las que llegan visitantes (referrers)" /></h3>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>Páginas desde las que llegan</p>
            <ReferrerCard referrers={data.referrers} />
          </div>
          <div className="analytics-card">
            <h3>Campañas (UTM) <HelpTip tip="Tráfico que llega con parámetros UTM en la URL, usados para rastrear campañas de marketing (anuncios, newsletters, etc.)" /></h3>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>Tráfico de campañas con parámetros UTM</p>
            {data.utmSources.length === 0 ? (
              <p className="admin-empty">Sin campañas activas.</p>
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

      {/* ── Qué ven y qué hacen ── */}
      <SectionHead id="contenido" title="Qué páginas visitan" tip="Páginas más populares, por dónde entran los visitantes y en qué elementos hacen clic" />
      {openSections.contenido && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Páginas más vistas <HelpTip tip="Ranking de las páginas con más visitas en el periodo seleccionado" /></h3>
            {data.topPages.map((p) => {
              const raw = p.path || "/";
              const clean = raw.split("?")[0] || "/";
              const name = clean === "/" ? "Inicio"
                : clean.startsWith("/habitaciones/") ? clean.replace("/habitaciones/", "Zona: ").replace(/\//g, " → ")
                : clean.startsWith("/blog/") ? clean.replace("/blog/", "Blog: ")
                : clean.replace(/^\//, "").replace(/\//g, " → ") || clean;
              return (
                <div key={raw} className="analytics-row"><span title={raw}>{name}</span><span>{p.views}</span></div>
              );
            })}
          </div>
          <div className="analytics-card">
            <h3>Primera página que ven <HelpTip tip="La primera página que carga cada visitante al entrar en la web (landing page)" /></h3>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>Por dónde entran los visitantes</p>
            {data.entryPages.map((e) => {
              const raw = e.path || "/";
              const clean = raw.split("?")[0] || "/";
              const name = clean === "/" ? "Inicio"
                : clean.startsWith("/habitaciones/") ? clean.replace("/habitaciones/", "Zona: ").replace(/\//g, " → ")
                : clean.startsWith("/blog/") ? clean.replace("/blog/", "Blog: ")
                : clean.replace(/^\//, "").replace(/\//g, " → ") || clean;
              return (
                <div key={raw} className="analytics-row"><span title={raw}>{name}</span><span>{e.sessions}</span></div>
              );
            })}
          </div>
          <div className="analytics-card">
            <h3>En qué hacen clic <HelpTip tip="Botones, enlaces y elementos interactivos en los que más hacen clic los usuarios" /></h3>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 8px" }}>Botones y enlaces más pulsados</p>
            {data.clicks.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.clicks.map((c) => (
                <div key={c.element} className="analytics-row"><span title={c.element}>{c.element.length > 50 ? c.element.slice(0, 50) + "…" : c.element}</span><span>{c.clicks}</span></div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Estrategia: SEO / SEM / GEO ── */}
      <SectionHead id="estrategia" title="Estrategia · SEO · SEM · GEO" tip="Clasifica tu tráfico en canales estratégicos (orgánico, pagado, IA generativa, social, directo) y propone acciones concretas basadas en tus números reales" />
      {openSections.estrategia && (
        <EstrategiaBlock
          sources={data.sources}
          referrers={data.referrers}
          utmSources={data.utmSources}
          totalVisitors={data.stats.visitors}
          totalVisits={data.stats.sessions}
          leads30d={leads?.total30d ?? null}
        />
      )}

      {/* ── Conversión Vende tu Casa ── */}
      {data.venta && (
        <>
          <SectionHead id="venta" title="Conversión · Vende tu Casa" tip="Funnel, exit intent, scroll depth y canales de conversión de la página /venta" />
          {openSections.venta && <VentaConversionBlock v={data.venta} />}
        </>
      )}

      {/* ── Grabaciones de sesión ── */}
      <SectionHead id="recordings" title="Grabaciones de sesión" tip="Reproduce visualmente lo que hace cada visitante en tu web (clicks, scroll, movimiento del cursor)" />
      {openSections.recordings && <RecordingsBlock />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bloque: Conversión de /venta
// ─────────────────────────────────────────────────────────────────

type VentaStats = NonNullable<PostHogData["venta"]>;

function VentaConversionBlock({ v }: { v: VentaStats }) {
  const convRate = v.visitors > 0 ? Math.round((v.submits / v.visitors) * 100 * 10) / 10 : 0;
  const step1Rate = v.visitors > 0 ? Math.round((v.step1 / v.visitors) * 100) : 0;
  const scrollMap = new Map(v.scroll.map((s) => [s.depth, s.users]));
  const users25 = scrollMap.get(25) ?? 0;
  const users50 = scrollMap.get(50) ?? 0;
  const users75 = scrollMap.get(75) ?? 0;
  const users100 = scrollMap.get(100) ?? 0;

  const exitShown = v.exitIntent.shown || 0;
  const exitConvRate = exitShown > 0 ? Math.round((v.exitIntent.submitted / exitShown) * 100) : 0;
  const exitCloseRate = exitShown > 0 ? Math.round((v.exitIntent.closed / exitShown) * 100) : 0;

  const maxSource = Math.max(1, ...v.convBySource.map((s) => s.conversions));

  return (
    <>
      {/* Resumen numérico */}
      <div className="analytics-stat-row" style={{ marginBottom: 16 }}>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{v.visitors}</div>
          <div className="analytics-stat-label">Visitantes a /venta</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{v.submits}</div>
          <div className="analytics-stat-label">Forms enviados</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value" style={{ color: convRate >= 3 ? "#059669" : convRate >= 1 ? "#d97706" : "#dc2626" }}>
            {convRate}%
          </div>
          <div className="analytics-stat-label">Tasa de conversión</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{v.waClicks}</div>
          <div className="analytics-stat-label">Clicks a WhatsApp</div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Funnel de conversión */}
        <div className="analytics-card">
          <h3>Funnel de conversión <HelpTip tip="Qué porcentaje de visitantes avanza en cada paso hasta enviar el formulario" /></h3>
          <FunnelStep label="Entra a /venta" count={v.visitors} base={v.visitors} />
          <FunnelStep label="Lee ≥50% de la página" count={users50} base={v.visitors} />
          <FunnelStep label="Usa la calculadora" count={v.calcUses} base={v.visitors} />
          <FunnelStep label="Completa el paso 1" count={v.step1} base={v.visitors} />
          <FunnelStep label="Envía el formulario" count={v.submits} base={v.visitors} highlight />
        </div>

        {/* Exit intent */}
        <div className="analytics-card">
          <h3>Exit intent popup <HelpTip tip="Popup que aparece cuando el usuario mueve el ratón fuera de la ventana (indica que se va)" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Rescate de usuarios a punto de irse</p>
          <div className="analytics-row"><span>🚪 Veces que se ha mostrado</span><span>{exitShown}</span></div>
          <div className="analytics-row"><span>👤 Usuarios únicos</span><span>{v.exitIntent.uniqueShown}</span></div>
          <div className="analytics-row"><span>❌ Cerraron sin más</span><span>{v.exitIntent.closed} ({exitCloseRate}%)</span></div>
          <div className="analytics-row"><span>✅ Dejaron teléfono</span><span style={{ color: "#059669", fontWeight: 600 }}>{v.exitIntent.submitted} ({exitConvRate}%)</span></div>
          <div style={{ borderTop: "1px dashed #eee", margin: "10px 0 6px", paddingTop: 8 }}>
            <div className="analytics-row"><span>👀 Lo leyeron ≥10s (siguen interesados)</span><span style={{ color: "#2563eb" }}>{v.exitIntent.dwell10s}</span></div>
            <div className="analytics-row"><span>🏃 Se fueron tras verlo</span><span>{v.exitIntent.abandoned}</span></div>
            <div className="analytics-row"><span>⏱ Se fueron tras ≥10s con él abierto</span><span>{v.exitIntent.abandonedAfter10s}</span></div>
            {v.exitIntent.avgCloseMs > 0 && (
              <div className="analytics-row"><span>⌛ Media al cerrar</span><span>{(v.exitIntent.avgCloseMs / 1000).toFixed(1)}s</span></div>
            )}
          </div>
          {exitShown > 0 && (
            <p style={{ fontSize: 11, color: "#6b7280", margin: "6px 0 0", fontStyle: "italic" }}>
              {exitConvRate >= 5
                ? "✨ Está funcionando muy bien."
                : exitConvRate >= 2
                  ? "Correcto, podría mejorar con otro copy."
                  : v.exitIntent.dwell10s / Math.max(1, exitShown) > 0.3
                    ? "📖 Mucha gente lo lee pero no convierte: cambia el CTA."
                    : "Casi todos lo cierran sin leer. Prueba otro titular."}
            </p>
          )}
        </div>

        {/* Después del exit intent */}
        <div className="analytics-card">
          <h3>Dónde van después del popup <HelpTip tip="A qué página saltan los que vieron el exit intent y no convirtieron (dentro de los 60 segundos siguientes)" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Si no dejan teléfono, ¿se van del sitio o siguen navegando?</p>
          {v.exitIntent.nextPages.length === 0 ? (
            <p className="admin-empty">Nadie siguió navegando aún.</p>
          ) : (
            v.exitIntent.nextPages.map((n) => (
              <div key={n.page} className="analytics-row"><span title={n.page}>{n.page}</span><span>{n.visits}</span></div>
            ))
          )}
        </div>

        {/* Scroll depth */}
        <div className="analytics-card">
          <h3>¿Hasta dónde leen? <HelpTip tip="Porcentaje de visitantes que llega a cada punto vertical de la página /venta" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Más alto = contenido engancha; más bajo = se van antes</p>
          <ScrollBar label="25% (hero + stats)" users={users25} total={v.visitors} />
          <ScrollBar label="50% (calculadora + testim.)" users={users50} total={v.visitors} />
          <ScrollBar label="75% (comparativa + pasos)" users={users75} total={v.visitors} />
          <ScrollBar label="100% (FAQ + form final)" users={users100} total={v.visitors} />
          {v.visitors > 0 && users50 / v.visitors < 0.4 && (
            <p style={{ fontSize: 11, color: "#b45309", margin: "10px 0 0", fontStyle: "italic" }}>
              ⚠️ Menos del 40% llega a la calculadora. Revisa el hero.
            </p>
          )}
        </div>

        {/* Fuente de conversiones */}
        <div className="analytics-card">
          <h3>Fuente de los que convierten <HelpTip tip="Desde qué canal llegaron los usuarios que SÍ enviaron el formulario de /venta" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Donde invertir más</p>
          {v.convBySource.length === 0 ? (
            <p className="admin-empty">Sin conversiones todavía en el periodo.</p>
          ) : (
            v.convBySource.map((s) => <Bar key={s.source} label={s.source} value={s.conversions} max={maxSource} />)
          )}
        </div>

        {/* Calculadora: con qué precios juegan */}
        <div className="analytics-card">
          <h3>Calculadora de ahorro <HelpTip tip="Qué precios usan los visitantes en la calculadora. Útil para saber el perfil de inmueble" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Perfil del inmueble que intentan vender</p>
          <div className="analytics-row"><span>Veces usada</span><span>{v.calc.uses}</span></div>
          <div className="analytics-row"><span>Precio medio</span><span>{v.calc.avgPrecio.toLocaleString("es-ES")} €</span></div>
          <div className="analytics-row"><span>Precio mediana</span><span>{v.calc.medianPrecio.toLocaleString("es-ES")} €</span></div>
          <div className="analytics-row"><span>Ahorro medio simulado</span><span style={{ color: "#059669", fontWeight: 600 }}>{v.calc.avgAhorro.toLocaleString("es-ES")} €</span></div>
        </div>

        {/* Step rate */}
        <div className="analytics-card">
          <h3>Abandono del formulario <HelpTip tip="Dónde se queda la gente que empieza a rellenar el formulario pero no termina" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Entre paso 1 y envío final</p>
          <div className="analytics-row"><span>Completan paso 1</span><span>{v.step1} ({step1Rate}%)</span></div>
          <div className="analytics-row"><span>Envían el formulario</span><span>{v.submits}</span></div>
          <div className="analytics-row">
            <span>Abandonan en paso 2</span>
            <span style={{ color: v.step1 - v.submits > v.submits ? "#dc2626" : "#f59e0b", fontWeight: 600 }}>
              {Math.max(0, v.step1 - v.submits)}
            </span>
          </div>
          {v.step1 > 0 && v.step1 - v.submits > v.submits && (
            <p style={{ fontSize: 11, color: "#b91c1c", margin: "10px 0 0", fontStyle: "italic" }}>
              ⚠️ Pierdes más gente en paso 2 de la que convierte. Revisa qué pides ahí.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function FunnelStep({ label, count, base, highlight }: { label: string; count: number; base: number; highlight?: boolean }) {
  const pct = base > 0 ? Math.round((count / base) * 100) : 0;
  return (
    <div style={{ margin: "6px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ fontWeight: highlight ? 600 : 400, color: highlight ? "#059669" : "inherit" }}>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>
          {count} · {pct}%
        </span>
      </div>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: highlight ? "linear-gradient(90deg, #10b981, #059669)" : "var(--orange)",
            borderRadius: 999,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bloque: Grabaciones de sesión (session replay)
// ─────────────────────────────────────────────────────────────────

type Recording = {
  session_id: string;
  start_time: string;
  duration_sec: number;
  active_sec: number;
  clicks: number;
  keypresses: number;
  start_url: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  device: string;
  browser: string;
  referrer_domain: string;
  converted: boolean;
  exit_intent_shown: boolean;
  exit_intent_action: string;
  player_url: string;
};

// Convierte un código de país ISO-3166 alpha-2 (ES, FR…) en su bandera emoji.
function banderaDe(code: string): string {
  if (!code || code.length !== 2) return "";
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function RecordingsBlock() {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"todos" | "convertidos" | "exit">("todos");
  const [pathFilter, setPathFilter] = useState("/venta");
  const [playing, setPlaying] = useState<{ url: string; sessionId: string } | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Offset real pedido a PostHog (independiente del nº de filas ya filtradas).
  const nextOffsetRef = useRef(0);

  const PAGE = 25;

  // Trae una página. offset=0 reemplaza la lista; offset>0 añade al final.
  const fetchPage = useCallback(async (offset: number) => {
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (pathFilter) params.set("path", pathFilter);
    if (filter === "convertidos") params.set("convertidos", "1");
    const res = await fetch(`/api/admin/posthog/recordings?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Error");
    let list: Recording[] = data.recordings ?? [];
    if (filter === "exit") list = list.filter((r) => r.exit_intent_shown);
    return { list, hasNext: Boolean(data.has_next) };
  }, [filter, pathFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { list, hasNext } = await fetchPage(0);
      nextOffsetRef.current = PAGE;
      setRecordings(list);
      setHasNext(hasNext);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setRecordings([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  async function cargarMas() {
    setLoadingMore(true);
    setError("");
    try {
      const { list, hasNext } = await fetchPage(nextOffsetRef.current);
      nextOffsetRef.current += PAGE;
      setRecordings((prev) => {
        const vistos = new Set((prev ?? []).map((r) => r.session_id));
        return [...(prev ?? []), ...list.filter((r) => !vistos.has(r.session_id))];
      });
      setHasNext(hasNext);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  async function openPlayer(r: Recording) {
    // Pedimos la URL pública compartida al vuelo (sin login en el iframe).
    try {
      const res = await fetch(`/api/admin/posthog/recordings/${r.session_id}/share`, { method: "POST" });
      const data = await res.json();
      const url = data?.shared_url || data?.fallback_url || r.player_url;
      setPlaying({ url, sessionId: r.session_id });
    } catch {
      setPlaying({ url: r.player_url, sessionId: r.session_id });
    }
  }

  function fmtDur(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }
  function fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    } catch { return iso; }
  }

  return (
    <>
      <div className="analytics-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            Página contiene:
            <input
              type="text"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="/venta"
              style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, width: 140 }}
            />
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            {(["todos", "convertidos", "exit"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px",
                  border: `1px solid ${filter === f ? "var(--orange)" : "#ddd"}`,
                  background: filter === f ? "var(--orange)" : "transparent",
                  color: filter === f ? "#fff" : "#333",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {f === "todos" ? "Todas" : f === "convertidos" ? "Solo conversiones" : "Vieron exit intent"}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <BotonInterno />
            <button onClick={load} disabled={loading} style={{ padding: "6px 12px", border: "1px solid #ddd", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              {loading ? "Cargando…" : "↻ Recargar"}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="lead-form-error" style={{ marginBottom: 10 }}>{error}</p>}

      <div className="analytics-card" style={{ padding: 0, overflow: "hidden" }}>
        {!recordings ? (
          <div style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>Cargando grabaciones…</div>
        ) : recordings.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>
            Sin grabaciones todavía. Da margen de 10-15 min desde que empiezan a entrar visitantes.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Entró en</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Duración</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Clicks</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Device</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Ubicación</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Origen</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 500 }}>Marcas</th>
                <th style={{ padding: "10px 14px" }} />
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr key={r.session_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{fmtDate(r.start_time)}</td>
                  <td style={{ padding: "10px 14px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.start_url}>
                    {r.start_url.replace(/^https?:\/\/[^/]+/, "") || "/"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDur(r.duration_sec)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.clicks}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.device || "—"}
                    {r.browser ? <span style={{ opacity: 0.5 }}> · {r.browser}</span> : null}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.country || r.region || r.city ? (
                      <>
                        <div>
                          {banderaDe(r.country_code) && <span style={{ marginRight: 4 }}>{banderaDe(r.country_code)}</span>}
                          {r.country || "—"}
                        </div>
                        {(r.region || r.city) && (
                          <div style={{ fontSize: 10, opacity: 0.6 }}>
                            {[r.region, r.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                          </div>
                        )}
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {r.referrer_domain || "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {r.converted && <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500 }}>✓ Convirtió</span>}
                      {r.exit_intent_shown && <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500 }}>Exit popup</span>}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <button
                      onClick={() => openPlayer(r)}
                      style={{
                        padding: "6px 14px",
                        background: "var(--orange)",
                        color: "#fff",
                        border: 0,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      ▶ Reproducir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {recordings && recordings.length > 0 && hasNext && (
          <div style={{ padding: 14, textAlign: "center", borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={cargarMas}
              disabled={loadingMore}
              style={{ padding: "8px 20px", border: "1px solid #ddd", background: "#fff", borderRadius: 6, cursor: loadingMore ? "wait" : "pointer", fontSize: 12, fontWeight: 500 }}
            >
              {loadingMore ? "Cargando…" : "Cargar más"}
            </button>
          </div>
        )}
      </div>

      {playing && (
        <div
          onClick={() => setPlaying(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 10, width: "min(1200px, 100%)", height: "min(90vh, 800px)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Grabación de sesión</strong>
                <span style={{ fontSize: 12, color: "#666", marginLeft: 10 }}>{(playing.sessionId || "").slice(0, 12)}…</span>
              </div>
              <button onClick={() => setPlaying(null)} style={{ padding: "6px 14px", border: "1px solid #ddd", background: "#fff", borderRadius: 6, cursor: "pointer" }}>
                Cerrar ✕
              </button>
            </div>
            <iframe
              src={playing.url}
              style={{ border: 0, flex: 1, width: "100%" }}
              allow="autoplay; clipboard-write"
              title="Session replay"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bloque: Estrategia SEO / SEM / GEO
// Clasifica el tráfico que ya nos reporta PostHog en canales
// estratégicos y propone acciones concretas basadas en esos números.
// NO inventa datos: todo lo que muestra sale de data.sources/referrers/utm.
// ─────────────────────────────────────────────────────────────────

type CanalKey = "seo" | "sem" | "geo" | "social" | "direct" | "other";

const CANAL_META: Record<CanalKey, { label: string; color: string; descripcion: string }> = {
  seo:    { label: "SEO · Buscadores (orgánico)", color: "#2563eb", descripcion: "Google, Bing, DuckDuckGo sin pagar" },
  sem:    { label: "SEM · Anuncios pagados",      color: "#dc2626", descripcion: "Google Ads, Meta Ads, campañas UTM cpc/paid" },
  geo:    { label: "GEO · IA generativa",         color: "#7c3aed", descripcion: "ChatGPT, Claude, Perplexity, Gemini, Copilot, Grok" },
  social: { label: "Social · Redes sociales",     color: "#ea580c", descripcion: "Instagram, TikTok, Facebook, X, LinkedIn, YouTube" },
  direct: { label: "Directo · Marca",             color: "#059669", descripcion: "Escriben la URL o la tienen guardada" },
  other:  { label: "Otros · Referrals",           color: "#6b7280", descripcion: "Webs que nos enlazan, blogs externos, foros" },
};

const DOMINIOS_IA = [
  "chat.openai.com", "chatgpt.com", "openai.com",
  "claude.ai", "anthropic.com",
  "perplexity.ai", "www.perplexity.ai",
  "gemini.google.com", "bard.google.com",
  "copilot.microsoft.com", "bing.com/chat",
  "grok.com", "x.ai",
  "you.com", "duckduckgo.com/aichat",
  "poe.com", "meta.ai", "character.ai",
];
const DOMINIOS_SEARCH = [
  "google.", "bing.com", "duckduckgo.com", "yahoo.", "ecosia.org", "startpage.com", "yandex.", "baidu.com",
];
const DOMINIOS_SOCIAL = [
  "instagram.com", "facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com",
  "tiktok.com", "linkedin.com", "lnkd.in",
  "twitter.com", "x.com", "t.co",
  "youtube.com", "youtu.be",
  "reddit.com", "whatsapp.com", "wa.me", "api.whatsapp.com",
  "pinterest.com", "snapchat.com", "threads.net",
];

function clasificarSource(source: string, medium: string | null): CanalKey {
  const s = source.toLowerCase();
  const m = (medium || "").toLowerCase();
  if (m === "cpc" || m === "paid" || m === "ads" || m === "ppc" || m === "paidsocial") return "sem";
  if (s === "(directo)" || s === "direct" || s === "$direct" || s === "") return "direct";
  if (DOMINIOS_IA.some((d) => s.includes(d))) return "geo";
  if (/^(chatgpt|openai|claude|anthropic|perplexity|gemini|bard|copilot|grok|poe|meta[\s-]*ai|you\.com)/.test(s)) return "geo";
  if (DOMINIOS_SOCIAL.some((d) => s.includes(d))) return "social";
  if (/^(instagram|facebook|tiktok|linkedin|x|twitter|youtube|reddit|whatsapp|pinterest|snapchat|threads)$/.test(s)) return "social";
  if (DOMINIOS_SEARCH.some((d) => s.includes(d)) || /^(google|bing|duckduckgo|yahoo|ecosia)$/.test(s)) return "seo";
  return "other";
}

function clasificarReferrer(url: string): CanalKey {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (DOMINIOS_IA.some((d) => host.endsWith(d) || host === d)) return "geo";
    if (DOMINIOS_SOCIAL.some((d) => host === d || host.endsWith(d))) return "social";
    if (DOMINIOS_SEARCH.some((d) => host.startsWith(d) || host.includes(d))) return "seo";
    return "other";
  } catch { return "other"; }
}

function EstrategiaBlock({
  sources,
  referrers,
  utmSources,
  totalVisitors,
  totalVisits,
  leads30d,
}: {
  sources: { source: string; visits: number; visitors: number }[];
  referrers: { url: string; visits: number; visitors: number }[];
  utmSources: { source: string; medium: string; visits: number; visitors: number }[];
  totalVisitors: number;
  totalVisits: number;
  leads30d: number | null;
}) {
  const { porCanal, iaBreakdown, hayPaid } = useMemo(() => {
    const porCanal: Record<CanalKey, { visits: number; visitors: number; items: { label: string; visits: number }[] }> = {
      seo: { visits: 0, visitors: 0, items: [] },
      sem: { visits: 0, visitors: 0, items: [] },
      geo: { visits: 0, visitors: 0, items: [] },
      social: { visits: 0, visitors: 0, items: [] },
      direct: { visits: 0, visitors: 0, items: [] },
      other: { visits: 0, visitors: 0, items: [] },
    };
    for (const s of sources) {
      const canal = clasificarSource(s.source, null);
      porCanal[canal].visits += s.visits;
      porCanal[canal].visitors += s.visitors;
      porCanal[canal].items.push({ label: s.source, visits: s.visits });
    }
    // Referrers aportan señales adicionales para GEO/social (sobre todo si vienen por link)
    const iaMap = new Map<string, number>();
    for (const r of referrers) {
      try {
        const host = new URL(r.url).hostname.replace(/^www\./, "").toLowerCase();
        const canal = clasificarReferrer(r.url);
        if (canal === "geo") iaMap.set(host, (iaMap.get(host) || 0) + r.visits);
      } catch { /* ignore */ }
    }
    // UTM paid detection
    let hayPaid = false;
    for (const u of utmSources) {
      const canal = clasificarSource(u.source, u.medium);
      if (canal === "sem") hayPaid = true;
    }
    const iaBreakdown = Array.from(iaMap.entries()).sort((a, b) => b[1] - a[1]);
    return { porCanal, iaBreakdown, hayPaid };
  }, [sources, referrers, utmSources]);

  const canalesOrdenados = (Object.entries(porCanal) as [CanalKey, (typeof porCanal)[CanalKey]][])
    .sort((a, b) => b[1].visits - a[1].visits);
  const totalCanales = canalesOrdenados.reduce((s, [, c]) => s + c.visits, 0) || 1;

  const propuestas = generarPropuestas(porCanal, hayPaid, iaBreakdown, totalCanales, leads30d);

  return (
    <>
      <div className="analytics-stat-row" style={{ marginBottom: 16 }}>
        {(["seo", "sem", "geo", "social"] as CanalKey[]).map((k) => {
          const c = porCanal[k];
          const pct = Math.round((c.visits / totalCanales) * 100);
          const meta = CANAL_META[k];
          return (
            <div key={k} className="analytics-stat" style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: meta.color }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4b5563" }}>
                  {k.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: meta.color }}>{pct}%</div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                {c.visits.toLocaleString()} visitas · {c.visitors.toLocaleString()} personas
              </div>
            </div>
          );
        })}
      </div>

      <div className="analytics-grid">
        {/* Reparto global */}
        <div className="analytics-card">
          <h3>Reparto de canales <HelpTip tip="Cuánto peso tiene cada canal en el total de tráfico. Un reparto equilibrado reduce el riesgo si un canal cae" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>
            Diagnóstico: dependencia por canal
          </p>
          <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "#f3f4f6", marginBottom: 14 }}>
            {canalesOrdenados.map(([k, c]) => {
              const pct = (c.visits / totalCanales) * 100;
              if (pct < 0.5) return null;
              return (
                <div
                  key={k}
                  style={{ width: `${pct}%`, background: CANAL_META[k].color }}
                  title={`${CANAL_META[k].label}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          {canalesOrdenados.map(([k, c]) => {
            const pct = totalCanales > 0 ? Math.round((c.visits / totalCanales) * 100) : 0;
            return (
              <div key={k} className="analytics-row">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: CANAL_META[k].color, display: "inline-block" }} />
                  <span>{CANAL_META[k].label}</span>
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.visits} · {pct}%</span>
              </div>
            );
          })}
          <p style={{ fontSize: 11, color: "#6b7280", margin: "10px 0 0", fontStyle: "italic" }}>
            Un sitio sano suele estar 40–60% SEO, 10–25% directo, 10–20% social y GEO/SEM creciendo.
          </p>
        </div>

        {/* GEO breakdown */}
        <div className="analytics-card">
          <h3>GEO · ¿Qué IAs te mandan tráfico? <HelpTip tip="Visitas identificadas que llegan desde el chat de una IA generativa (ChatGPT, Claude, Perplexity, Gemini, Copilot, Grok…). Son el tráfico del futuro — optimizar para IA = GEO" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>
            Generative Engine Optimization
          </p>
          {iaBreakdown.length === 0 && porCanal.geo.visits === 0 ? (
            <>
              <p className="admin-empty" style={{ margin: "8px 0" }}>Aún no detectamos tráfico desde IA en este periodo.</p>
              <p style={{ fontSize: 12, color: "#374151", margin: "8px 0" }}>
                No es raro: muchas IAs no envían <code>Referer</code> cuando el usuario hace click. Para medirlo mejor, añade siempre <code>?utm_source=chatgpt</code> o similar en los enlaces que publiques y pídele a Gladis que mencione tu web con URL completa.
              </p>
            </>
          ) : (
            <>
              {iaBreakdown.slice(0, 10).map(([host, visits]) => (
                <div key={host} className="analytics-row">
                  <span>{iaLabel(host)}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{visits}</span>
                </div>
              ))}
              {porCanal.geo.visits > iaBreakdown.reduce((s, [, v]) => s + v, 0) && (
                <div className="analytics-row">
                  <span style={{ opacity: 0.7 }}>Otras IAs / UTMs IA</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {porCanal.geo.visits - iaBreakdown.reduce((s, [, v]) => s + v, 0)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* SEO breakdown */}
        <div className="analytics-card">
          <h3>SEO · Buscadores que te traen tráfico <HelpTip tip="Visitas desde buscadores sin pagar. Si Google es casi el 100%, tienes concentración de riesgo" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Posicionamiento orgánico</p>
          {porCanal.seo.items.length === 0 ? (
            <p className="admin-empty">Sin tráfico orgánico detectado.</p>
          ) : (
            porCanal.seo.items.sort((a, b) => b.visits - a.visits).slice(0, 6).map((it) => (
              <div key={it.label} className="analytics-row">
                <span>{it.label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{it.visits}</span>
              </div>
            ))
          )}
        </div>

        {/* SEM breakdown */}
        <div className="analytics-card">
          <h3>SEM · Campañas pagadas <HelpTip tip="Tráfico identificado como pagado (UTM medium cpc/paid/ads). Si está vacío, no hay inversión activa en Google Ads o Meta Ads" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 10px" }}>Inversión publicitaria</p>
          {!hayPaid ? (
            <>
              <p className="admin-empty" style={{ margin: "8px 0" }}>No se detectan campañas de pago activas.</p>
              <p style={{ fontSize: 12, color: "#374151", margin: "8px 0 0" }}>
                Para medir SEM, etiqueta siempre tus anuncios con <code>?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=NOMBRE</code>.
              </p>
            </>
          ) : (
            utmSources
              .filter((u) => clasificarSource(u.source, u.medium) === "sem")
              .map((u) => (
                <div key={u.source + u.medium} className="analytics-row">
                  <span>{u.source} / {u.medium}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{u.visits}</span>
                </div>
              ))
          )}
        </div>

        {/* Propuestas accionables */}
        <div className="analytics-card" style={{ gridColumn: "1 / -1" }}>
          <h3>🎯 Propuestas accionables <HelpTip tip="Recomendaciones generadas automáticamente a partir de tus propios números. No son plantillas: cada punto responde a algo que se ve (o no se ve) en tus datos" /></h3>
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 12px" }}>
            Generadas desde el reparto real de canales del periodo seleccionado
          </p>
          {propuestas.length === 0 ? (
            <p className="admin-empty">Todo está sorprendentemente equilibrado. Mantén el ritmo.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {propuestas.map((p, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: 12,
                    background: p.urgente ? "#fef2f2" : "#f9fafb",
                    border: `1px solid ${p.urgente ? "#fecaca" : "#e5e7eb"}`,
                    borderRadius: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: CANAL_META[p.canal].color,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {p.canal.toUpperCase().slice(0, 3)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>{p.titulo}</div>
                    <div style={{ fontSize: "0.82rem", color: "#4b5563", lineHeight: 1.5 }}>{p.detalle}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function iaLabel(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("chatgpt") || h.includes("openai")) return "ChatGPT (OpenAI)";
  if (h.includes("claude") || h.includes("anthropic")) return "Claude (Anthropic)";
  if (h.includes("perplexity")) return "Perplexity";
  if (h.includes("gemini") || h.includes("bard")) return "Gemini (Google)";
  if (h.includes("copilot") || h.includes("bing.com/chat")) return "Copilot (Microsoft)";
  if (h.includes("grok") || h.includes("x.ai")) return "Grok (xAI)";
  if (h.includes("you.com")) return "You.com";
  if (h.includes("duckduckgo.com/aichat")) return "DuckDuckGo AI";
  if (h.includes("poe.com")) return "Poe";
  if (h.includes("meta.ai")) return "Meta AI";
  return host;
}

type Propuesta = { canal: CanalKey; titulo: string; detalle: string; urgente: boolean };

function generarPropuestas(
  porCanal: Record<CanalKey, { visits: number; visitors: number; items: { label: string; visits: number }[] }>,
  hayPaid: boolean,
  iaBreakdown: [string, number][],
  total: number,
  leads30d: number | null,
): Propuesta[] {
  const propuestas: Propuesta[] = [];
  const pct = (k: CanalKey) => (total > 0 ? (porCanal[k].visits / total) * 100 : 0);

  const seoPct = pct("seo");
  const geoPct = pct("geo");
  const semPct = pct("sem");
  const socialPct = pct("social");
  const directPct = pct("direct");

  // ── SEO ────────────────────────────────────────────────────────
  if (seoPct < 20) {
    propuestas.push({
      canal: "seo",
      titulo: `Tu SEO es flojo (${seoPct.toFixed(0)}% del tráfico).`,
      detalle: "La vía más barata a medio plazo. Prioridad: contenido en el blog respondiendo preguntas reales (\"cuánto cuesta alquilar en Murcia\", \"gestión de alquiler Murcia\", zonas universitarias). Técnico: revisa títulos, metadescripciones, enlazado interno y velocidad en móvil (Lighthouse > 90). Objetivo realista: subir a 40% en 6 meses.",
      urgente: true,
    });
  } else if (seoPct > 65 && !hayPaid) {
    propuestas.push({
      canal: "seo",
      titulo: `${seoPct.toFixed(0)}% del tráfico es SEO: riesgo de concentración.`,
      detalle: "Un cambio de algoritmo de Google y pierdes la mitad del negocio en un mes. Diversifica abriendo un canal secundario fuerte (Instagram Reels, campaña SEM pequeña, o posicionamiento en IAs).",
      urgente: false,
    });
  } else {
    // SEO está entre 20-65% — está sano, propuestas de mejora
    const topBuscadores = porCanal.seo.items.sort((a, b) => b.visits - a.visits);
    const google = topBuscadores.find((it) => /google/i.test(it.label));
    if (google && google.visits / Math.max(1, porCanal.seo.visits) > 0.9) {
      propuestas.push({
        canal: "seo",
        titulo: "Casi todo tu SEO es Google.",
        detalle: "Bing/DuckDuckGo pesan poco pero sus índices alimentan a Copilot y ChatGPT (OpenAI usa Bing). Da de alta la web en Bing Webmaster Tools y verifica indexación. Ganancia doble: SEO Bing + aparecer en Copilot.",
        urgente: false,
      });
    }
  }

  // ── GEO (IA generativa) ────────────────────────────────────────
  if (geoPct < 2) {
    propuestas.push({
      canal: "geo",
      titulo: `GEO prácticamente a 0 (${porCanal.geo.visits} visitas).`,
      detalle: "ChatGPT, Perplexity y Gemini ya están desviando búsquedas de Google. Acciones concretas: (1) añade schema.org/RealEstateAgent y FAQPage en las páginas clave; (2) escribe artículos tipo \"guía de\" con bullets claros que las IAs puedan citar; (3) regístrate en Perplexity Business para aparecer en sus respuestas; (4) consigue menciones en portales que las IAs citan (idealista noticias, La Verdad, La Opinión de Murcia); (5) añade utm_source=chatgpt a tus enlaces compartidos para medirlo.",
      urgente: true,
    });
  } else if (geoPct < 8) {
    propuestas.push({
      canal: "geo",
      titulo: `GEO empieza a tirar (${geoPct.toFixed(1)}%). Dobla la apuesta.`,
      detalle: `Ya vienen de ${iaBreakdown.length} IAs. Identifica qué páginas te está citando (mira los paths de entrada de esas visitas) y haz más contenido parecido. Añade un apartado \"Preguntas frecuentes\" con respuestas de 2-3 frases: ese formato es el que las IAs copian.`,
      urgente: false,
    });
  }

  // ── SEM ────────────────────────────────────────────────────────
  if (!hayPaid) {
    propuestas.push({
      canal: "sem",
      titulo: "Cero inversión publicitaria detectada.",
      detalle: "Para activar SEM con riesgo bajo: Google Ads 200€/mes a palabras clave de alta intención (\"alquiler piso Murcia centro\", \"habitación universidad Murcia\", \"vender piso Murcia\"), landing dedicada y UTMs. Si ya haces anuncios y no se ven aquí, es que no estás etiquetando con utm_medium=cpc.",
      urgente: false,
    });
  } else if (semPct > 40 && leads30d !== null && leads30d < 10) {
    propuestas.push({
      canal: "sem",
      titulo: `Pagas por el ${semPct.toFixed(0)}% del tráfico pero generas pocos leads.`,
      detalle: "El coste por lead está probablemente alto. Pausa las campañas con peor CTR, concentra el presupuesto en 2-3 anuncios ganadores y revisa la landing: si no convierte, el problema no es el anuncio.",
      urgente: true,
    });
  }

  // ── Social ─────────────────────────────────────────────────────
  if (socialPct < 5) {
    propuestas.push({
      canal: "social",
      titulo: `Las redes sociales apenas te traen tráfico (${socialPct.toFixed(1)}%).`,
      detalle: "Instagram y TikTok son los que mejor funcionan para inmobiliaria local en 2026. 2 Reels/semana con tour de habitaciones + 1 Story diaria con precio y zona. En descripción, siempre link a interroommurcia.com/habitaciones.",
      urgente: false,
    });
  }

  // ── Directo ────────────────────────────────────────────────────
  if (directPct > 50) {
    propuestas.push({
      canal: "direct",
      titulo: `${directPct.toFixed(0)}% directo: marca fuerte, pero techo de crecimiento.`,
      detalle: "La gente ya te conoce, no te está encontrando por canales nuevos. Para crecer necesitas captar frío: SEO de contenidos + GEO + un canal social activo.",
      urgente: false,
    });
  } else if (directPct < 10 && total > 100) {
    propuestas.push({
      canal: "direct",
      titulo: `Marca débil: solo ${directPct.toFixed(1)}% escribe la URL directa.`,
      detalle: "Para subirlo: aparecer con URL completa en los artículos de contenido, firmar los emails con la URL, poner la URL en el perfil de Instagram y en firma de WhatsApp Business.",
      urgente: false,
    });
  }

  return propuestas.slice(0, 7);
}

function ScrollBar({ label, users, total }: { label: string; users: number; total: number }) {
  const pct = total > 0 ? Math.round((users / total) * 100) : 0;
  return (
    <div style={{ margin: "6px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>{pct}% ({users})</span>
      </div>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct >= 50 ? "#059669" : pct >= 25 ? "#d97706" : "#dc2626",
            borderRadius: 999,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
