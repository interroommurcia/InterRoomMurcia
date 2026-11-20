import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "../../../../../components/AdminNav";
import { listarContratosPapelera, type TipoContrato } from "../../../../../lib/contratos";
import PapeleraAcciones from "./PapeleraAcciones";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Papelera de contratos — Backoffice",
  robots: { index: false, follow: false },
};

const TIPO_LABEL: Record<TipoContrato, string> = {
  exclusiva_venta: "Exclusiva venta",
  gestion_alquiler: "Gestión alquiler",
};

const DIA = 24 * 60 * 60 * 1000;

export default async function PapeleraContratosPage() {
  const contratos = await listarContratosPapelera().catch(() => []);

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Papelera de contratos</h2>
            <p>Los contratos eliminados se guardan aquí 90 días y luego se borran solos.</p>
          </div>
          <Link
            href="/admin/documentos/contratos"
            style={{ background: "#fff", color: "#374151", padding: "10px 18px", borderRadius: 8, fontWeight: 500, textDecoration: "none", fontSize: "0.88rem", border: "1px solid #e5e7eb" }}
          >
            ← Volver a contratos
          </Link>
        </div>

        {contratos.length === 0 ? (
          <div className="analytics-card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ opacity: 0.6, margin: 0 }}>La papelera está vacía.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid #eee" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Tipo</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Propietario</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Inmueble</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Eliminado</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c) => {
                  const tipo = (c.tipo ?? "exclusiva_venta") as TipoContrato;
                  const borrado = c.deleted_at ? new Date(c.deleted_at) : null;
                  const diasEnPapelera = borrado ? Math.floor((Date.now() - borrado.getTime()) / DIA) : 0;
                  const restantes = Math.max(0, 90 - diasEnPapelera);
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>{TIPO_LABEL[tipo]}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                        {c.datos.propietario?.nombre || <em style={{ opacity: 0.5 }}>Sin nombre</em>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "0.9rem", opacity: 0.8 }}>
                        {c.datos.inmueble?.direccion || <em style={{ opacity: 0.5 }}>—</em>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "0.85rem", opacity: 0.75 }}>
                        {borrado ? borrado.toLocaleDateString("es-ES") : "—"}
                        <span style={{ display: "block", fontSize: "0.75rem", color: restantes <= 7 ? "#dc2626" : "#9ca3af" }}>
                          {restantes === 0 ? "se borrará pronto" : `quedan ${restantes} días`}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <PapeleraAcciones contratoId={c.id} />
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
