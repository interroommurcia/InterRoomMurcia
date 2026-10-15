import type { Metadata } from "next";
import { listarLeads } from "../../../lib/leads";
import { listarLeadsProximamente } from "../../../lib/leadsProximamente";
import { AdminNav } from "../../../components/AdminNav";
import LeadsManager from "./LeadsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export default async function LeadsPage() {
  const [leads, leadsProx] = await Promise.all([listarLeads(), listarLeadsProximamente()]);

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads" />
        <LeadsManager leads={leads} leadsProximamente={leadsProx} />
      </div>
    </section>
  );
}
