import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "../../../../components/AdminNav";
import { listarContratos, type EstadoContrato, type TipoContrato } from "../../../../lib/contratos";

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

const TIPO_LABEL: Record<TipoContrato, string> = {
  exclusiva_venta: "Exclusiva venta",
  gestion_alquiler: "Gestión alquiler",
};

const EMAIL_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  enviado: { label: "✉ Enviado", bg: "#e0e7ff", color: "#3730a3" },
  entregado: { label: "✓ Entregado", bg: "#dcfce7", color: "#166534" },
  rebotado: { label: "⚠ Rebotado", bg: "#fee2e2", color: "#991b1b" },
  queja: { label: "⚠ Spam", bg: "#fee2e2", color: "#991b1b" },
  fallo: { label: "⚠ Fallo email", bg: "#fee2e2", color: "#991b1b" },
};

const TIPO_COLOR: Record<TipoContrato, string> = {
  exclusiva_venta: "#ea6a12",
  gestion_alquiler: "#2563eb",
};

export default async function ContratosListPage() {
  const contratos = await listarContratos().catch(() => []);

  // Pendientes de firmar por la agencia: aún no firmó la agencia y el contrato sigue en curso.
  const pendientesAgencia = contratos.filter(
    (c) => c.estado === "pendiente_firmas" || c.estado === "firmado_propietario",
  );

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        {pendientesAgencia.length > 0 && (
          <Link
            href={`/admin/documentos/contratos/${pendientesAgencia[0].id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 20,
              textDecoration: "none",
              color: "#92400e",
            }}
          >
            <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>⚠️</span>
            <span style={{ flex: 1, fontSize: "0.92rem", fontWeight: 500 }}>
              {pendientesAgencia.length === 1
                ? "1 contrato pendiente de firmar por la agencia"
                : `${pendientesAgencia.length} contratos pendientes de firmar por la agencia`}
            </span>
            <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>Firmar ahora →</span>
          </Link>
        )}

        <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Contratos</h2>
            <p>Encargos de venta en exclusiva emitidos.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/admin/documentos/contratos/nuevo"
              style={{
                background: "var(--orange)",
                color: "#fff",
                padding: "10px 18px",
                borderRadius: 8,
                fontWeight: 500,
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              + Exclusiva venta
            </Link>
            <Link
              href="/admin/documentos/contratos/nuevo-gestion"
              style={{
                background: "#2563eb",
                color: "#fff",
                padding: "10px 18px",
                borderRadius: 8,
                fontWeight: 500,
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              + Gestión alquiler
            </Link>
          </div>
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
          <div className="admin-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Propietario</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Estado</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Inmueble</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Importe</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Creado</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c) => {
                  const tipo = (c.tipo ?? "exclusiva_venta") as TipoContrato;
                  const importe =
                    tipo === "gestion_alquiler"
                      ? (c.datos as { renta_mensual?: number }).renta_mensual
                        ? `${(c.datos as { renta_mensual?: number }).renta_mensual!.toLocaleString("es-ES")} €/mes`
                        : "—"
                      : (c.datos as { precio_venta?: number }).precio_venta
                        ? `${(c.datos as { precio_venta?: number }).precio_venta!.toLocaleString("es-ES")} €`
                        : "—";
                  return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: "0.72rem",
                          fontWeight: 500,
                          background: `${TIPO_COLOR[tipo]}1a`,
                          color: TIPO_COLOR[tipo],
                        }}
                      >
                        {TIPO_LABEL[tipo]}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/admin/documentos/contratos/${c.id}`} style={{ color: "var(--ink)", fontWeight: 500 }}>
                        {c.datos.propietario?.nombre || <em style={{ opacity: 0.5 }}>Sin nombre</em>}
                      </Link>
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
                      {(c.estado === "pendiente_firmas" || c.estado === "firmado_propietario") && (
                        <Link
                          href={`/admin/documentos/contratos/${c.id}`}
                          style={{ marginLeft: 8, color: "#b45309", fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap" }}
                        >
                          Firmar →
                        </Link>
                      )}
                      {c.email_estado && EMAIL_BADGE[c.email_estado] && (
                        <div style={{ marginTop: 6 }}>
                          <span
                            title={c.email_error ?? undefined}
                            style={{
                              display: "inline-block",
                              padding: "2px 9px",
                              borderRadius: 999,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              background: EMAIL_BADGE[c.email_estado].bg,
                              color: EMAIL_BADGE[c.email_estado].color,
                            }}
                          >
                            {EMAIL_BADGE[c.email_estado].label}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.9rem", opacity: 0.8 }}>
                      {c.datos.inmueble?.direccion || <em style={{ opacity: 0.5 }}>—</em>}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: "0.9rem" }}>
                      {importe}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", opacity: 0.7 }}>
                      {new Date(c.created_at).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
