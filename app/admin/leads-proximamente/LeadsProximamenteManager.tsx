"use client";

import type { LeadProximamente } from "../../../lib/leadsProximamente";

function groupByPiso(leads: LeadProximamente[]) {
  const groups: Record<string, { titulo: string; categoria: string; leads: LeadProximamente[] }> = {};
  for (const l of leads) {
    if (!groups[l.piso_id]) {
      groups[l.piso_id] = { titulo: l.piso_titulo, categoria: l.piso_categoria, leads: [] };
    }
    groups[l.piso_id].leads.push(l);
  }
  return Object.entries(groups);
}

function descargarExcel(leads: LeadProximamente[]) {
  const groups = groupByPiso(leads);
  const BOM = "﻿";
  const lines: string[] = [];

  for (const [, group] of groups) {
    const tipo = group.categoria === "compraventa" ? "Compraventa" : "Alquiler";
    lines.push(`Propiedad:;${group.titulo};Tipo:;${tipo}`);
    lines.push("Nombre;Teléfono;Fecha");
    for (const l of group.leads) {
      const fecha = new Date(l.created_at).toLocaleString("es-ES");
      lines.push(`${l.nombre};${l.telefono};${fecha}`);
    }
    lines.push("");
  }

  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-proximamente-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsProximamenteManager({ leads }: { leads: LeadProximamente[] }) {
  const groups = groupByPiso(leads);

  return (
    <>
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Leads Próximamente</h2>
          <p>{leads.length} interesados en {groups.length} propiedades</p>
        </div>
        {leads.length > 0 && (
          <button
            type="button"
            onClick={() => descargarExcel(leads)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "var(--orange)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Descargar Excel
          </button>
        )}
      </div>

      {groups.length === 0 && (
        <p className="admin-empty">No hay leads de propiedades próximamente.</p>
      )}

      {groups.map(([pisoId, group]) => {
        const tipo = group.categoria === "compraventa" ? "Compraventa" : "Alquiler";
        return (
          <div key={pisoId} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{group.titulo}</h3>
              <span className={`seccion-badge seccion-${group.categoria === "compraventa" ? "inversores" : "estudiantes"}`}>
                {tipo}
              </span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                {group.leads.length} interesado{group.leads.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {group.leads.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.created_at).toLocaleString("es-ES")}</td>
                      <td>{l.nombre || "—"}</td>
                      <td><a href={`tel:${l.telefono}`}>{l.telefono}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 24 }}>
        Los leads se eliminan automáticamente 15 días después de que la propiedad deje de estar en Próximamente.
      </p>
    </>
  );
}
