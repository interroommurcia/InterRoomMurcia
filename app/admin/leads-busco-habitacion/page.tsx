import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import { listarLeadsBuscoHabitacion } from "../../../lib/leadsBuscoHabitacion";
import LeadsBuscoHabitacionManager from "./LeadsBuscoHabitacionManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Busco Habitación — Backoffice",
  robots: { index: false, follow: false },
};

export default async function LeadsBuscoHabitacionPage() {
  const leads = await listarLeadsBuscoHabitacion();
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads-busco-habitacion" />
        <div className="section-head">
          <h2>Busco Habitación</h2>
          <p>
            Estudiantes que han dejado su contacto para que les avisemos cuando quede una habitación libre.
            Llegan desde el apartado Estudiantes, el catálogo y la home.
          </p>
        </div>
        <LeadsBuscoHabitacionManager leads={leads} />
      </div>
    </section>
  );
}
