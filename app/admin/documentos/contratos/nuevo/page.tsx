import type { Metadata } from "next";
import { AdminNav } from "../../../../../components/AdminNav";
import NuevoContratoForm from "./NuevoContratoForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nuevo contrato — Backoffice",
  robots: { index: false, follow: false },
};

export default function NuevoContratoPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        <div className="section-head">
          <h2>Nuevo contrato de exclusiva</h2>
          <p>Carga un cliente del CRM o rellena los campos manualmente.</p>
        </div>

        <NuevoContratoForm />
      </div>
    </section>
  );
}
