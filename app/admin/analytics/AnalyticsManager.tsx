"use client";

import { useEffect, useState, useMemo } from "react";

type PostHogData = {
  stats7d: { pageviews: number; visitors: number; sessions: number };
  stats30d: { pageviews: number; visitors: number };
  bounceRate: number;
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
};

type LeadsData = {
  total7d: number;
  total30d: number;
  byOrigen: { origen: string; count: number }[];
};

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

export default function AnalyticsManager() {
  const [data, setData] = useState<PostHogData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadsData | null>(null);

  useEffect(() => {
    fetch("/api/admin/posthog")
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: "Error cargando analytics" }));
          setError(d.error || "Error cargando analytics");
          return;
        }
        setData(await res.json());
      })
      .catch(() => setError("Error de red cargando analytics"))
      .finally(() => setLoading(false));

    fetch("/api/admin/leads-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setLeads(d))
      .catch(() => {});
  }, []);

  if (loading) return <p className="admin-empty">Cargando analytics...</p>;
  if (error) return <p className="lead-form-error">{error}</p>;
  if (!data) return null;

  const maxDaily = Math.max(1, ...data.dailyViews.map((d) => d.pageviews));
  const maxNewUsers = Math.max(1, ...data.newUsersDaily.map((d) => d.newUsers));
  const maxSource = Math.max(1, ...data.sources.map((s) => s.visits));
  const maxCountry = Math.max(1, ...data.countries.map((c) => c.visits));
  const totalNewUsers7d = data.newUsersDaily
    .filter((d) => new Date(d.day) >= new Date(Date.now() - 7 * 86400000))
    .reduce((s, d) => s + d.newUsers, 0);
  const totalNewUsers30d = data.newUsersDaily.reduce((s, d) => s + d.newUsers, 0);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    resumen: true,
    leads: true,
    audiencia: true,
    trafico: true,
    contenido: true,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function SectionHead({ id, title }: { id: string; title: string }) {
    return (
      <div
        className="analytics-section-head"
        onClick={() => toggleSection(id)}
        style={{ cursor: "pointer" }}
      >
        <span style={{ fontSize: "0.75rem", marginRight: 6, opacity: 0.5 }}>{openSections[id] ? "▼" : "▶"}</span>
        <h2>{title}</h2>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* ── Resumen ── */}
      <SectionHead id="resumen" title="Resumen" />
      {openSections.resumen && (
        <>
          <div className="analytics-stat-row">
            <div className="analytics-stat">
              <div className="analytics-stat-value">{data.stats7d.pageviews}</div>
              <div className="analytics-stat-label">Pageviews (7d)</div>
            </div>
            <div className="analytics-stat">
              <div className="analytics-stat-value">{data.stats7d.visitors}</div>
              <div className="analytics-stat-label">Visitantes (7d)</div>
            </div>
            <div className="analytics-stat">
              <div className="analytics-stat-value">{data.stats30d.pageviews}</div>
              <div className="analytics-stat-label">Pageviews (30d)</div>
            </div>
            <div className="analytics-stat">
              <div className="analytics-stat-value">{data.bounceRate}%</div>
              <div className="analytics-stat-label">Tasa de rebote (7d)</div>
            </div>
            <div className="analytics-stat">
              <div className="analytics-stat-value">{totalNewUsers7d}</div>
              <div className="analytics-stat-label">Usuarios nuevos (7d)</div>
            </div>
            <div className="analytics-stat">
              <div className="analytics-stat-value">{totalNewUsers30d}</div>
              <div className="analytics-stat-label">Usuarios nuevos (30d)</div>
            </div>
          </div>

          {data.realtime.length > 0 && (
            <div className="analytics-card">
              <h3>En este momento</h3>
              {data.realtime.map((r) => (
                <div key={r.path} className="analytics-row">
                  <span>{r.path || "/"}</span>
                  <span>{r.active} activos</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Leads ── */}
      {leads && (
        <>
          <SectionHead id="leads" title="Leads y conversión" />
          {openSections.leads && (
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Leads y conversión</h3>
                <div className="analytics-row">
                  <span>Leads (7d)</span>
                  <span>{leads.total7d}</span>
                </div>
                <div className="analytics-row">
                  <span>Leads (30d)</span>
                  <span>{leads.total30d}</span>
                </div>
                {data && data.stats30d.visitors > 0 && (
                  <div className="analytics-row">
                    <span>Conversión visitantes → lead (30d)</span>
                    <span>{((leads.total30d / data.stats30d.visitors) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>

              <div className="analytics-card">
                <h3>Leads por origen (30d)</h3>
                {leads.byOrigen.length === 0 ? (
                  <p className="admin-empty">Sin leads todavía.</p>
                ) : (
                  leads.byOrigen.map((o) => (
                    <div key={o.origen} className="analytics-row">
                      <span>{o.origen}</span>
                      <span>{o.count}</span>
                    </div>
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
            <h3>Usuarios nuevos por día (30d)</h3>
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
            <h3>Pageviews por día (30d)</h3>
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
            <h3>Dispositivos (30d)</h3>
            {data.devices.map((d) => (
              <div key={d.device} className="analytics-row">
                <span>{d.device}</span>
                <span>{d.visits}</span>
              </div>
            ))}
          </div>

          <div className="analytics-card">
            <h3>Países (30d)</h3>
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
            <h3>Fuentes de tráfico (30d)</h3>
            {data.sources.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.sources.map((s) => <Bar key={s.source} label={s.source} value={s.visits} max={maxSource} />)
            )}
          </div>

          <div className="analytics-card">
            <h3>Referrers (30d)</h3>
            <ReferrerCard referrers={data.referrers} />
          </div>

          <div className="analytics-card">
            <h3>UTM (30d)</h3>
            {data.utmSources.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.utmSources.map((u) => (
                <div key={u.source + u.medium} className="analytics-row">
                  <span>{u.medium ? `${u.source} / ${u.medium}` : u.source}</span>
                  <span>{u.visits}</span>
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
            <h3>Páginas más vistas (30d)</h3>
            {data.topPages.map((p) => (
              <div key={p.path} className="analytics-row">
                <span>{p.path || "/"}</span>
                <span>{p.views}</span>
              </div>
            ))}
          </div>

          <div className="analytics-card">
            <h3>Páginas de entrada (30d)</h3>
            {data.entryPages.map((e) => (
              <div key={e.path} className="analytics-row">
                <span>{e.path || "/"}</span>
                <span>{e.sessions}</span>
              </div>
            ))}
          </div>

          <div className="analytics-card">
            <h3>Clicks en botones (30d)</h3>
            {data.clicks.length === 0 ? (
              <p className="admin-empty">Sin datos.</p>
            ) : (
              data.clicks.map((c) => (
                <div key={c.element} className="analytics-row">
                  <span>{c.element}</span>
                  <span>{c.clicks}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
