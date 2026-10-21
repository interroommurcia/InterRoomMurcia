import type { Metadata } from "next";
import Link from "next/link";
import ClienteContabilidadManager from "./ClienteContabilidadManager";
import { AdminNav } from "../../../../components/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cliente — Contabilidad",
  robots: { index: false, follow: false },
};

export default function ClienteContabilidadPage({ params }: { params: { clienteId: string } }) {
  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/contabilidad" />
        <div style={{ marginBottom: 12 }}>
          <Link href="/admin/contabilidad" className="btn-ghost" style={{ fontSize: 13 }}>← Volver a contabilidad</Link>
        </div>
        <ClienteContabilidadManager clienteId={params.clienteId} />
      </div>
    </section>
  );
}
