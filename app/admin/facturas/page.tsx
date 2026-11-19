import type { Metadata } from "next";
import FacturasManager from "./FacturasManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Facturas — Backoffice",
  robots: { index: false, follow: false },
};

export default function FacturasPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/facturas" />
        <div className="section-head">
          <h2>Facturas</h2>
          <p>Elige un cliente, selecciona el pago pendiente y genera la factura. Márcala como cobrada para archivarla en el Trimestral. Se guardan de forma permanente.</p>
        </div>
        <FacturasManager />
      </div>
    </section>
  );
}
