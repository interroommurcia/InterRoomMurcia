import type { Metadata } from "next";
import CaptacionManager from "./CaptacionManager";
import { AdminNav } from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hoja de ruta de contactados — Backoffice",
  robots: { index: false, follow: false },
};

export default function CaptacionPage() {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/captacion" />
        <div className="section-head">
          <h2>Hoja de ruta de contactados</h2>
          <p>Una hoja de contacto por cada casa. Se guarda sola y la vas rellenando y actualizando.</p>
        </div>
        <CaptacionManager />
      </div>
    </section>
  );
}
