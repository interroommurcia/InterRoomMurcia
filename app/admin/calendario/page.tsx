import type { Metadata } from "next";
import CalendarioManager from "./CalendarioManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendario — Backoffice",
  robots: { index: false, follow: false },
};

export default function CalendarioPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/calendario" />
        <div className="section-head">
          <h2>Calendario</h2>
          <p>Vista mensual y semanal de tareas, citas y visitas. Gladis también puede anotar y consultar aquí desde Telegram.</p>
        </div>
        <CalendarioManager />
      </div>
    </section>
  );
}
