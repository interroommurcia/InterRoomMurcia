import type { Metadata } from "next";
import { AdminNav } from "../../../../../components/AdminNav";
import NuevoContratoGestionForm from "./NuevoContratoGestionForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nuevo contrato de gestión — Backoffice",
  robots: { index: false, follow: false },
};

export default function NuevoContratoGestionPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        <div className="section-head">
          <h2>Nuevo contrato de gestión de alquiler</h2>
          <p>Carga un propietario del CRM o rellena los campos manualmente. El cliente lo firma online y La Agencia firma después para generar el PDF.</p>
        </div>

        <NuevoContratoGestionForm />
      </div>
    </section>
  );
}
