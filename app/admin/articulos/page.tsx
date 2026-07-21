import type { Metadata } from "next";
import Link from "next/link";
import ArticulosManager from "./ArticulosManager";

export const metadata: Metadata = {
  title: "Artículos — Backoffice",
  robots: { index: false, follow: false },
};

export default function ArticulosPage() {
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
          <Link href="/admin/articulos" className="admin-nav-item active">
            Artículos
          </Link>
          <Link href="/admin/analytics" className="admin-nav-item">
            Analytics
          </Link>
        </div>
        <div className="section-head">
          <h2>Generador de artículos SEO</h2>
          <p>Genera artículos optimizados para Google, Bing y ChatGPT sobre alquiler de habitaciones en Murcia.</p>
        </div>
        <ArticulosManager />
      </div>
    </section>
  );
}
