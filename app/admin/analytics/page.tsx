import type { Metadata } from "next";
import AnalyticsManager from "./AnalyticsManager";
import { AdminNav } from "../../../components/AdminNav";
import { getSesion } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics — Backoffice",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  const sesion = await getSesion();
  const esAdmin = sesion?.rol === "admin";
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/analytics" />
        <div className="section-head">
          <h2>Tráfico web</h2>
          <p>De dónde vienen tus visitas y qué páginas funcionan mejor.</p>
        </div>
        <AnalyticsManager esAdmin={esAdmin} />
      </div>
    </section>
  );
}
