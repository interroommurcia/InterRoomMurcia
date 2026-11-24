"use client";

import { useMemo, useState } from "react";
import type { LeadComercial } from "../../../lib/leadsComerciales";

type Filtro = "todos" | "estudiante" | "propietario";

function toCSV(rows: LeadComercial[]): string {
  const head = ["tipo", "nombre", "email", "telefono", "consentimiento", "origen", "fecha"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.tipo, r.nombre, r.email ?? "", r.telefono ?? "", r.consentimiento ? "sí" : "no", r.origen,
      new Date(r.created_at).toLocaleString("es-ES")].map(esc).join(";")
  );
  return [head.join(";"), ...lines].join("\n");
}

export default function LeadsComercialesManager({ leads }: { leads: LeadComercial[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const visibles = useMemo(
    () => (filtro === "todos" ? leads : leads.filter((l) => l.tipo === filtro)),
    [leads, filtro]
  );

  const nEst = leads.filter((l) => l.tipo === "estudiante").length;
  const nProp = leads.filter((l) => l.tipo === "propietario").length;

  function exportar() {
    const csv = "﻿" + toCSV(visibles); // BOM para que Excel abra bien los acentos
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-comerciales-${filtro}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {(["todos", "estudiante", "propietario"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`btn-ghost${filtro === f ? " active" : ""}`}
            onClick={() => setFiltro(f)}
            style={filtro === f ? { background: "var(--orange)", color: "#fff" } : undefined}
          >
            {f === "todos" ? `Todos (${leads.length})` : f === "estudiante" ? `Estudiantes (${nEst})` : `Propietarios (${nProp})`}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn-primary" onClick={exportar} disabled={!visibles.length}>
          Exportar CSV ({visibles.length})
        </button>
      </div>

      {visibles.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Todavía no hay registros. Comparte la página <b>/unete</b> y empezarán a entrar.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "8px 10px" }}>Tipo</th>
                <th style={{ padding: "8px 10px" }}>Nombre</th>
                <th style={{ padding: "8px 10px" }}>Email</th>
                <th style={{ padding: "8px 10px" }}>Teléfono</th>
                <th style={{ padding: "8px 10px" }}>Origen</th>
                <th style={{ padding: "8px 10px" }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: l.tipo === "propietario" ? "#7c3aed" : "#2563eb" }}>
                      {l.tipo === "propietario" ? "Propietario" : "Estudiante"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px" }}>{l.nombre || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : "—"}</td>
                  <td style={{ padding: "8px 10px" }}>{l.telefono ?? "—"}</td>
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
