import type { Metadata } from "next";
import Link from "next/link";
import { getPisos } from "../../../lib/pisos";
import PisosManager from "./PisosManager";

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
        <div className="admin-nav">
          <Link href="/admin" className="admin-nav-item">
            Leads
          </Link>
          <Link href="/admin/pisos" className="admin-nav-item active">
            Catálogo
          </Link>
        </div>
        <div className="section-head">
          <h2>Catálogo de pisos</h2>
          <p>{pisos.length} pisos publicados</p>
        </div>
        <PisosManager pisos={pisos} />
      </div>
    </section>
  );
}
