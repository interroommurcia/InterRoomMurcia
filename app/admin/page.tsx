import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "../../components/AdminNav";
import { calcularPendientes } from "../../lib/secretaria";
import { listarTareasEntreFechas } from "../../lib/mesaTrabajo";
import { listarConversaciones } from "../../lib/chat";
import { metricasAnuales } from "../../lib/contabilidad";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

function euros(n: number) {
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`;
}

export default async function AdminHome() {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const anioActual = new Date().getUTCFullYear();
  const mesActual = new Date().getUTCMonth();

  const [pendientes, agendaHoy, conversaciones, metricas] = await Promise.all([
    calcularPendientes().catch(() => ({ leadsSinContactar: [], telefonosIncompletos: [], alquileresSinCobrar: [] })),
    listarTareasEntreFechas(hoy, hoy).catch(() => []),
    listarConversaciones().catch(() => []),
    metricasAnuales(anioActual).catch(() => null),
  ]);

  const chatsPendientes = conversaciones.filter((c) => c.estado === "escalada" && !c.leido);
  const mesMetrica = metricas?.meses[mesActual];
  const brutoMes = mesMetrica?.bruto ?? 0;
  const netoMes = mesMetrica?.neto ?? 0;
  const alquileresMes = mesMetrica?.alquileres ?? 0;
  const brutoAnual = metricas?.totalAnual.bruto ?? 0;

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin" />

        <div className="section-head">
          <h2>Hoy en InterRoom</h2>
          <p>Resumen de lo que necesita tu atención</p>
        </div>

        <div className="analytics-stat-row" style={{ marginBottom: 24 }}>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{euros(brutoMes)}</div>
            <div className="analytics-stat-label">Bruto este mes</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{euros(netoMes)}</div>
            <div className="analytics-stat-label">Neto este mes</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{euros(alquileresMes)}</div>
            <div className="analytics-stat-label">Alquileres este mes</div>
          </div>
          <div className="analytics-stat">
            <div className="analytics-stat-value">{euros(brutoAnual)}</div>
            <div className="analytics-stat-label">Bruto {anioActual}</div>
          </div>
        </div>

        <div className="analytics-grid" style={{ marginBottom: 16 }}>
          <div className="analytics-card">
            <h3>
              📅 Agenda de hoy{" "}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>({agendaHoy.length})</span>
            </h3>
            {agendaHoy.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: "0.85rem", padding: "8px 0" }}>Sin eventos hoy.</div>
            ) : (
              agendaHoy.map((t) => (
                <div key={t.id} className="analytics-row">
                  <span>
                    <strong>{t.hora ?? "—"}</strong> · {t.titulo}
                    {t.clienteNombre ? ` · ${t.clienteNombre}` : ""}
                  </span>
                  <span style={{ opacity: 0.6 }}>{t.tipo}</span>
                </div>
              ))
            )}
            <div style={{ marginTop: 10 }}>
              <Link href="/admin/mesa-trabajo" style={{ fontSize: "0.8rem", color: "var(--orange-dark)" }}>
                Ver mesa de trabajo →
              </Link>
            </div>
          </div>

          <div className="analytics-card">
            <h3>
              💬 Chats sin leer{" "}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>({chatsPendientes.length})</span>
            </h3>
            {chatsPendientes.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: "0.85rem", padding: "8px 0" }}>Sin chats escalados pendientes.</div>
            ) : (
              chatsPendientes.slice(0, 5).map((c) => (
                <div key={c.id} className="analytics-row">
                  <span>
                    <strong>{c.nombre ?? "Anónimo"}</strong>
                    {c.contacto ? ` · ${c.contacto}` : ""}
                    {c.motivo_escalado ? ` — ${c.motivo_escalado.slice(0, 60)}` : ""}
                  </span>
                  <span style={{ opacity: 0.6 }}>{new Date(c.updated_at).toLocaleDateString("es-ES")}</span>
                </div>
              ))
            )}
            <div style={{ marginTop: 10 }}>
              <Link href="/admin/chats" style={{ fontSize: "0.8rem", color: "var(--orange-dark)" }}>
                Ver chats →
              </Link>
            </div>
          </div>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>
              🔴 Leads sin contactar{" "}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>({pendientes.leadsSinContactar.length})</span>
            </h3>
            {pendientes.leadsSinContactar.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: "0.85rem", padding: "8px 0" }}>Todo contactado en plazo.</div>
            ) : (
              pendientes.leadsSinContactar.slice(0, 8).map((l) => (
                <div key={l.id} className="analytics-row">
                  <span>
                    <strong>{l.nombre}</strong> · <a href={`tel:${l.telefono}`}>{l.telefono}</a>
                  </span>
                  <span style={{ color: l.dias >= 7 ? "#dc2626" : "#f59e0b" }}>{l.dias}d</span>
                </div>
              ))
            )}
            <div style={{ marginTop: 10 }}>
              <Link href="/admin/leads" style={{ fontSize: "0.8rem", color: "var(--orange-dark)" }}>
                Ver todos los leads →
              </Link>
            </div>
          </div>

          <div className="analytics-card">
            <h3>
              💰 Alquileres pendientes{" "}
              <span style={{ opacity: 0.5, fontWeight: 400 }}>({pendientes.alquileresSinCobrar.length})</span>
            </h3>
            {pendientes.alquileresSinCobrar.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: "0.85rem", padding: "8px 0" }}>Todo cobrado este mes.</div>
            ) : (
              pendientes.alquileresSinCobrar.slice(0, 8).map((a) => (
                <div key={a.id} className="analytics-row">
                  <span>
                    <strong>{a.nombre}</strong>
                  </span>
                  <span>{euros(a.mensualidad)}</span>
                </div>
              ))
            )}
            <div style={{ marginTop: 10 }}>
              <Link href="/admin/contabilidad" style={{ fontSize: "0.8rem", color: "var(--orange-dark)" }}>
                Ver contabilidad →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
