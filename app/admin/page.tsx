import type { Metadata } from "next";
import { listarLeads } from "../../lib/leads";
import { AdminNav } from "../../components/AdminNav";
import ConvertirClienteButton from "./ConvertirClienteButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const leads = await listarLeads();

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin" />
        <div className="section-head">
          <h2>Leads de propietarios</h2>
          <p>{leads.length} solicitudes recibidas</p>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Dirección / zona</th>
                <th>Tipo</th>
                <th>m²</th>
                <th>Precio deseado</th>
                <th>Mensaje</th>
                <th>Origen</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{new Date(lead.created_at).toLocaleString("es-ES")}</td>
                  <td>{lead.nombre}</td>
                  <td>
                    <a href={`tel:${lead.telefono}`}>{lead.telefono}</a>
                  </td>
                  <td>{lead.email || "—"}</td>
                  <td>{lead.direccion}</td>
                  <td>{lead.tipo || "—"}</td>
                  <td>{lead.metros ?? "—"}</td>
                  <td>{lead.precio_deseado ? `${lead.precio_deseado}€` : "—"}</td>
                  <td>{lead.mensaje || "—"}</td>
                  <td>{lead.origen || "—"}</td>
                  <td>
                    <ConvertirClienteButton
                      leadId={lead.id}
                      nombre={lead.nombre}
                      telefono={lead.telefono}
                      direccion={lead.direccion}
                      email={lead.email}
                    />
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={11} className="admin-empty">
                    Todavía no hay solicitudes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
