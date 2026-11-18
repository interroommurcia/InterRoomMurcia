import type { Metadata } from "next";
import CaptacionManager, { type PisoOpcion } from "./CaptacionManager";
import { AdminNav } from "../../../components/AdminNav";
import { getPisos } from "../../../lib/pisos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hoja de ruta de contactados — Backoffice",
  robots: { index: false, follow: false },
};

export default async function CaptacionPage() {
  const pisos = await getPisos();
  const opciones: PisoOpcion[] = pisos.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    barrio: p.barrio,
    categoria: p.categoria,
  }));

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/captacion" />
        <div className="section-head">
          <h2>Hoja de ruta de contactados</h2>
          <p>Una hoja de contacto por cada casa. Se guarda sola y la vas rellenando y actualizando.</p>
        </div>
        <CaptacionManager pisos={opciones} />
      </div>
    </section>
  );
}
