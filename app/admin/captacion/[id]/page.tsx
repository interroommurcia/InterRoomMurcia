import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminNav } from "../../../../components/AdminNav";
import { obtenerCasa } from "../../../../lib/captacion";
import HojaDetalle from "./HojaDetalle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hoja de contacto — Backoffice",
  robots: { index: false, follow: false },
};

export default async function CasaDetallePage({ params }: { params: { id: string } }) {
  const casa = await obtenerCasa(params.id);
  if (!casa) notFound();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/captacion" />
        <div className="section-head">
          <h2>Hoja de contacto</h2>
          <Link href="/admin/captacion" className="btn-ghost" style={{ textDecoration: "none" }}>
            ← Volver a la hoja de ruta
          </Link>
        </div>
        <HojaDetalle casa={casa} />
      </div>
    </section>
  );
}
