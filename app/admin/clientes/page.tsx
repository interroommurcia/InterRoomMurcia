import type { Metadata } from "next";
import ClientesManager from "./ClientesManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes — Backoffice",
  robots: { index: false, follow: false },
};

export default function ClientesPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/clientes" />
        <div className="section-head">
          <h2>Clientes</h2>
          <p>Fichas de propietarios, estudiantes, compradores finalistas y clientes de créditos.</p>
        </div>
        <ClientesManager />
      </div>
    </section>
  );
}
