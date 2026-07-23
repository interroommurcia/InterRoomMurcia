import type { Metadata } from "next";
import ContabilidadManager from "./ContabilidadManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contabilidad — Backoffice",
  robots: { index: false, follow: false },
};

export default function ContabilidadPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/contabilidad" />
        <div className="section-head">
          <h2>Contabilidad</h2>
          <p>Fichas de clientes, alquileres mes a mes y operaciones de compraventa con sus gastos.</p>
        </div>
        <ContabilidadManager />
      </div>
    </section>
  );
}
