import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClienteFichaManager from "./ClienteFichaManager";
import { AdminNav } from "../../../../components/AdminNav";
import { getCliente } from "../../../../lib/contabilidad";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cliente — Documentos",
  robots: { index: false, follow: false },
};

export default async function ClienteFichaPage({ params }: { params: { id: string } }) {
  const cliente = await getCliente(params.id);
  if (!cliente) notFound();
  const nombre = `${cliente.nombre}${cliente.apellidos ? ` ${cliente.apellidos}` : ""}`;

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/clientes" />
        <div style={{ marginBottom: 12 }}>
          <Link href="/admin/clientes" className="btn-ghost" style={{ fontSize: 13 }}>← Volver a clientes</Link>
        </div>
        <div className="section-head">
          <h2>{nombre}</h2>
          <p>
            {cliente.telefono || "sin teléfono"} · {cliente.email || "sin email"} · {cliente.nif ? `NIF: ${cliente.nif}` : "sin NIF"}
          </p>
        </div>
        <ClienteFichaManager clienteId={params.id} />
      </div>
    </section>
  );
}
