import type { Metadata } from "next";
import { listarLeads } from "../../../lib/leads";
import { AdminNav } from "../../../components/AdminNav";
import LeadsManager from "./LeadsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export default async function LeadsPage() {
  const leads = await listarLeads();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads" />
        <LeadsManager leads={leads} />
      </div>
    </section>
  );
}
