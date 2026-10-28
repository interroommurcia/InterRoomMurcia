import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import { listarLeadsCasas } from "../../../lib/leadsCasas";
import LeadsCasasManager from "./LeadsAlquilerManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads por casa",
  robots: { index: false, follow: false },
};

export default async function LeadsCasasPage() {
  const grupos = await listarLeadsCasas();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads-alquiler" />
        <LeadsCasasManager grupos={grupos} />
      </div>
    </section>
  );
}
