import type { Metadata } from "next";
import { listarLeads } from "../../../lib/leads";
import { listarLeadsProximamente } from "../../../lib/leadsProximamente";
import { getPisos } from "../../../lib/pisos";
import { AdminNav } from "../../../components/AdminNav";
import LeadsManager, { type PisoProximamenteItem } from "./LeadsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false, follow: false },
};

export default async function LeadsPage() {
  const [leads, leadsProx, pisos] = await Promise.all([
    listarLeads(),
    listarLeadsProximamente(),
    getPisos(),
  ]);

  const pisosProximamente: PisoProximamenteItem[] = pisos
    .filter((p) => p.estado === "proximamente")
    .map((p) => ({ id: p.id, titulo: p.titulo, categoria: p.categoria }));

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/leads" />
        <LeadsManager leads={leads} leadsProximamente={leadsProx} pisosProximamente={pisosProximamente} />
      </div>
    </section>
  );
}
