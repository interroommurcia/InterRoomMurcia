import type { Metadata } from "next";
import { AdminNav } from "../../../components/AdminNav";
import { getSesion } from "../../../lib/auth";
import { redirect } from "next/navigation";
import UsuariosManager from "./UsuariosManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usuarios",
  robots: { index: false, follow: false },
};

export default async function UsuariosPage() {
  const session = await getSesion();
  if (session && session.rol !== "admin") redirect("/admin");

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/usuarios" />
        <div className="section-head">
          <h2>Usuarios</h2>
          <p>Gestiona los accesos al backoffice.</p>
        </div>
        <UsuariosManager />
      </div>
    </section>
  );
}
