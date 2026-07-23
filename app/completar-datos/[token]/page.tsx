import type { Metadata } from "next";
import { getClientePorToken } from "../../../lib/contabilidad";
import CompletarDatosForm from "./CompletarDatosForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Completa tus datos — InterRoom Murcia",
  robots: { index: false, follow: false },
};

export default async function CompletarDatosPage({ params }: { params: { token: string } }) {
  const cliente = await getClientePorToken(params.token);

  if (!cliente) {
    return (
      <section className="section">
        <div className="wrap" style={{ maxWidth: 480 }}>
          <h2>Enlace no válido</h2>
          <p>Este enlace ha caducado o no existe. Pide uno nuevo a InterRoom Murcia.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <h2>Completa tus datos</h2>
        <p>Rellena tus datos de contacto para que el equipo de InterRoom Murcia pueda ayudarte.</p>
        <CompletarDatosForm
          token={params.token}
          inicial={{
            nombre: cliente.nombre,
            apellidos: cliente.apellidos || "",
            telefono: cliente.telefono || "",
            tipo: cliente.tipo,
            zona_interes: cliente.zona_interes || "",
            operacion: cliente.operacion || "",
          }}
          yaCompletado={cliente.datos_completados}
        />
      </div>
    </section>
  );
}
