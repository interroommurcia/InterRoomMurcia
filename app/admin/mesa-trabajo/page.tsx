import type { Metadata } from "next";
import MesaTrabajoManager from "./MesaTrabajoManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mesa de trabajo — Backoffice",
  robots: { index: false, follow: false },
};

export default function MesaTrabajoPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/mesa-trabajo" />
        <div className="section-head">
          <h2>Mesa de trabajo</h2>
          <p>Tareas, citas y visitas pendientes, con cliente vinculado opcional.</p>
        </div>
        <MesaTrabajoManager />
      </div>
    </section>
  );
}
