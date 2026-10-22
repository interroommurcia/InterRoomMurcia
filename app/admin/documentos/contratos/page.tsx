import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "../../../../components/AdminNav";
import { listarContratos, type EstadoContrato } from "../../../../lib/contratos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contratos — Backoffice",
  robots: { index: false, follow: false },
};

const ESTADO_LABEL: Record<EstadoContrato, string> = {
  borrador: "Borrador",
  pendiente_firmas: "Pendiente firmas",
  firmado_propietario: "Firmó propietario",
  firmado_agencia: "Firmó agencia",
  firmado: "✓ Firmado",
  cancelado: "Cancelado",
};

const ESTADO_COLOR: Record<EstadoContrato, string> = {
  borrador: "#9ca3af",
  pendiente_firmas: "#f59e0b",
  firmado_propietario: "#3b82f6",
  firmado_agencia: "#3b82f6",
  firmado: "#059669",
  cancelado: "#dc2626",
};

export default async function ContratosListPage() {
  const contratos = await listarContratos().catch(() => []);

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Contratos</h2>
            <p>Encargos de venta en exclusiva emitidos.</p>
          </div>
          <Link
            href="/admin/documentos/contratos/nuevo"
            className="btn-primary"
            style={{
              background: "var(--orange)",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 500,
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            + Nuevo contrato
          </Link>
        </div>

        {contratos.length === 0 ? (
          <div className="analytics-card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ opacity: 0.6, margin: 0 }}>Aún no hay contratos emitidos.</p>
            <Link
              href="/admin/documentos/contratos/nuevo"
              style={{ color: "var(--orange-dark)", fontSize: "0.9rem", display: "inline-block", marginTop: 12 }}
            >
              Crea el primero →
            </Link>
          </div>
        ) : (
          <div className="analytics-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Propietario</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Inmueble</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Precio</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Creado</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/admin/documentos/contratos/${c.id}`} style={{ color: "var(--ink)", fontWeight: 500 }}>
                        {c.datos.propietario?.nombre || <em style={{ opacity: 0.5 }}>Sin nombre</em>}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", opacity: 0.8 }}>
                      {c.datos.inmueble?.direccion || <em style={{ opacity: 0.5 }}>—</em>}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.9rem" }}>
                      {c.datos.precio_venta
                        ? `${c.datos.precio_venta.toLocaleString("es-ES")} €`
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          background: `${ESTADO_COLOR[c.estado]}1a`,
                          color: ESTADO_COLOR[c.estado],
                        }}
                      >
                        {ESTADO_LABEL[c.estado]}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", opacity: 0.7 }}>
                      {new Date(c.created_at).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
