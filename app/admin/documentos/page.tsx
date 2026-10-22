import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Documentos — Backoffice",
  robots: { index: false, follow: false },
};

export default function DocumentosPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        <div className="section-head">
          <h2>Documentos</h2>
          <p>Contratos profesionales y herramientas de cálculo.</p>
        </div>

        <div className="analytics-grid">
          <Link
            href="/admin/documentos/contratos"
            className="analytics-card"
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <h3>📝 Contratos</h3>
            <p style={{ margin: "8px 0 14px", fontSize: "0.9rem", opacity: 0.75, lineHeight: 1.5 }}>
              Encargos de venta en exclusiva. Rellénalos tú o pídeselo a Gladis.
              Firma táctil o electrónica, PDF automático y envío al cliente.
            </p>
            <span style={{ fontSize: "0.85rem", color: "var(--orange-dark)", fontWeight: 500 }}>
              Ver contratos →
            </span>
          </Link>

          <Link
            href="/rentabilidad"
            className="analytics-card"
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <h3>📊 Rentabilidad</h3>
            <p style={{ margin: "8px 0 14px", fontSize: "0.9rem", opacity: 0.75, lineHeight: 1.5 }}>
              Calculadora para propietarios: simula qué le rentaría su piso con
              nuestra gestión. Página privada para enviar por enlace.
            </p>
            <span style={{ fontSize: "0.85rem", color: "var(--orange-dark)", fontWeight: 500 }}>
              Abrir calculadora →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
