import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import { listarLeadsComerciales } from "../../../lib/leadsComerciales";
import LeadsComercialesManager from "./LeadsComercialesManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads comerciales — Backoffice",
  robots: { index: false, follow: false },
};

export default async function LeadsComercialesPage() {
  const leads = await listarLeadsComerciales();
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads-comerciales" />
        <div className="section-head">
          <h2>Leads comerciales</h2>
          <p>
            Base de datos de estudiantes y propietarios que se han apuntado desde la web para recibir avisos.
            Úsala para enviar en masa cuando quede una habitación libre.
          </p>
        </div>
        <LeadsComercialesManager leads={leads} />
      </div>
    </section>
  );
}
