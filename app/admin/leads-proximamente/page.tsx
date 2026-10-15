import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import { listarLeadsProximamente } from "../../../lib/leadsProximamente";
import LeadsProximamenteManager from "./LeadsProximamenteManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Próximamente",
  robots: { index: false, follow: false },
};

export default async function LeadsProximamentePage() {
  const leads = await listarLeadsProximamente();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads-proximamente" />
        <LeadsProximamenteManager leads={leads} />
      </div>
    </section>
  );
}
