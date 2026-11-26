"use client";

import type { LeadBuscoHabitacion } from "../../../lib/leadsBuscoHabitacion";

function toCSV(rows: LeadBuscoHabitacion[]): string {
  const head = ["nombre", "email", "telefono", "descripcion", "origen", "fecha"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.nombre, r.email ?? "", r.telefono ?? "", r.mensaje ?? "", r.origen, new Date(r.created_at).toLocaleString("es-ES")]
      .map(esc).join(";")
  );
  return [head.join(";"), ...lines].join("\n");
}

export default function LeadsBuscoHabitacionManager({ leads }: { leads: LeadBuscoHabitacion[] }) {
  function exportar() {
    const csv = "﻿" + toCSV(leads); // BOM para que Excel abra bien los acentos
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `busco-habitacion-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>{leads.length} estudiante{leads.length !== 1 ? "s" : ""} esperando habitación</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn-primary" onClick={exportar} disabled={!leads.length}>
          Exportar CSV ({leads.length})
        </button>
      </div>

      {leads.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Todavía no hay nadie apuntado. Los CTA del catálogo y la home los irán trayendo.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px 10px" }}>Nombre</th>
                <th style={{ padding: "8px 10px" }}>Email</th>
                <th style={{ padding: "8px 10px" }}>Teléfono</th>
                <th style={{ padding: "8px 10px" }}>Descripción</th>
                <th style={{ padding: "8px 10px" }}>Origen</th>
                <th style={{ padding: "8px 10px" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px" }}>{l.nombre || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{l.telefono ?? "—"}</td>
                  <td style={{ padding: "8px 10px", maxWidth: 280, color: "#4b5563" }}>{l.mensaje || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#9ca3af" }}>{l.origen}</td>
                  <td style={{ padding: "8px 10px", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {new Date(l.created_at).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
