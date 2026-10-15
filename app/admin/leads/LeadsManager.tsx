"use client";

import { useState } from "react";
import ConvertirClienteButton from "../ConvertirClienteButton";
import type { Lead } from "../../../lib/leads";

const CATEGORIAS = [
  { key: "todos", label: "Todos" },
  { key: "propietarios", label: "Propietarios" },
  { key: "inversores", label: "Inversores" },
  { key: "venta", label: "Ventas" },
  { key: "estudiantes", label: "Estudiantes" },
  { key: "luz", label: "Luz" },
] as const;

type CatKey = (typeof CATEGORIAS)[number]["key"];

function seccionLabel(s: string | null): string {
  if (!s) return "propietarios";
  const map: Record<string, string> = {
    propietarios: "Propietarios",
    inversores: "Inversores",
    venta: "Ventas",
    estudiantes: "Estudiantes",
    luz: "Luz",
  };
  return map[s] ?? s;
}

export default function LeadsManager({ leads }: { leads: Lead[] }) {
  const [filtro, setFiltro] = useState<CatKey>("todos");

  const filtered = filtro === "todos"
    ? leads
    : leads.filter((l) => (l.seccion || "propietarios") === filtro);

  const counts: Record<string, number> = {};
  for (const l of leads) {
    const s = l.seccion || "propietarios";
    counts[s] = (counts[s] || 0) + 1;
  }

  return (
    <>
      <div className="section-head">
        <h2>Leads</h2>
        <p>{leads.length} solicitudes recibidas</p>
      </div>

      <div className="leads-filtros">
        {CATEGORIAS.map((cat) => {
          const count = cat.key === "todos" ? leads.length : (counts[cat.key] || 0);
          return (
            <button
              key={cat.key}
              type="button"
              className={`leads-filtro ${filtro === cat.key ? "leads-filtro-active" : ""} leads-filtro-${cat.key}`}
              onClick={() => setFiltro(cat.key)}
            >
              {cat.label}
              <span className="leads-filtro-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
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
            {filtered.map((lead) => (
              <tr key={lead.id}>
                <td>{new Date(lead.created_at).toLocaleString("es-ES")}</td>
                <td>
                  <span className={`seccion-badge seccion-${lead.seccion || "propietarios"}`}>
                    {seccionLabel(lead.seccion)}
                  </span>
                </td>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="admin-empty">
                  No hay leads en esta categoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
