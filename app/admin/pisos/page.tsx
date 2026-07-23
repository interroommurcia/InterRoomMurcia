import type { Metadata } from "next";
import { getPisos } from "../../../lib/pisos";
import PisosManager from "./PisosManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Backoffice · Catálogo",
  robots: { index: false, follow: false },
};

export default async function AdminPisosPage() {
  const pisos = await getPisos();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/pisos" />
        <div className="section-head">
          <h2>Catálogo de pisos</h2>
          <p>{pisos.length} pisos publicados</p>
        </div>
        <PisosManager pisos={pisos} />
      </div>
    </section>
  );
}
