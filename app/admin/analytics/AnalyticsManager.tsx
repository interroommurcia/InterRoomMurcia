"use client";

import { useEffect, useState } from "react";

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

export default function AnalyticsManager() {
  const [data, setData] = useState<PostHogData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) return <p className="admin-empty">Cargando analytics...</p>;
  if (error) return <p className="lead-form-error">{error}</p>;
  if (!data) return null;

  const maxDaily = Math.max(1, ...data.dailyViews.map((d) => d.pageviews));
  const maxSource = Math.max(1, ...data.sources.map((s) => s.visits));
  const maxCountry = Math.max(1, ...data.countries.map((c) => c.visits));

  return (
    <div className="analytics-dashboard">
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

        <div className="analytics-card">
          <h3>Pageviews por día (30d)</h3>
          <div className="analytics-daily-chart">
            {data.dailyViews.map((d) => (
              <div key={d.day} className="analytics-daily-col">
                <div className="analytics-daily-bar" style={{ height: `${Math.round((d.pageviews / maxDaily) * 100)}%` }} />
                <span>{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
