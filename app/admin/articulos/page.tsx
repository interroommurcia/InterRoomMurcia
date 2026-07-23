import type { Metadata } from "next";
import ArticulosManager from "./ArticulosManager";
import { AdminNav } from "../../../components/AdminNav";

export const metadata: Metadata = {
  title: "Artículos — Backoffice",
  robots: { index: false, follow: false },
};

export default function ArticulosPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/articulos" />
        <div className="section-head">
          <h2>Generador de artículos SEO</h2>
          <p>Genera artículos optimizados para Google, Bing y ChatGPT sobre alquiler de habitaciones en Murcia.</p>
        </div>
        <ArticulosManager />
      </div>
    </section>
  );
}
