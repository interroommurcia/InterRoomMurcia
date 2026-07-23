import type { Metadata } from "next";
import Link from "next/link";
import AnalyticsManager from "./AnalyticsManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics — Backoffice",
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <div className="admin-nav">
          <Link href="/admin" className="admin-nav-item">
            Leads
          </Link>
          <Link href="/admin/pisos" className="admin-nav-item">
            Catálogo
          </Link>
          <Link href="/admin/articulos" className="admin-nav-item">
            Artículos
          </Link>
          <Link href="/admin/analytics" className="admin-nav-item active">
            Analytics
          </Link>
        </div>
        <div className="section-head">
          <h2>Tráfico web</h2>
          <p>De dónde vienen tus visitas y qué páginas funcionan mejor.</p>
        </div>
        <AnalyticsManager />
      </div>
    </section>
  );
}
