import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import { listarLeadsAlquiler } from "../../../lib/leadsAlquiler";
import LeadsAlquilerManager from "./LeadsAlquilerManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Alquiler",
  robots: { index: false, follow: false },
};

export default async function LeadsAlquilerPage() {
  const leads = await listarLeadsAlquiler();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads-alquiler" />
        <LeadsAlquilerManager leads={leads} />
      </div>
    </section>
  );
}
