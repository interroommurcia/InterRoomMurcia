import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import PropiedadesManager from "./PropiedadesManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Propiedades",
  robots: { index: false, follow: false },
};

export default function PropiedadesPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/propiedades" />
        <div className="section-head">
          <h2>Propiedades</h2>
          <p>Fichas de pisos y casas captadas.</p>
        </div>
        <PropiedadesManager />
      </div>
    </section>
  );
}
