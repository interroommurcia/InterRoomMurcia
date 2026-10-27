"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadAlquiler } from "../../../lib/leadsAlquiler";

function descargarExcel(leads: LeadAlquiler[]) {
  const BOM = "﻿";
  const lines: string[] = ["Tipo;Grupo;Propiedad;Nombre;Teléfono;Mensaje;Fecha;Estado"];
  for (const l of leads) {
    const tipo = l.tipo_interes === "grupo" ? "Grupo" : "Individual";
    const grupo = l.tipo_interes === "grupo" && l.grupo_tam ? String(l.grupo_tam) : "";
    const fecha = new Date(l.created_at).toLocaleString("es-ES");
    const estado = l.contactado ? "Contactado" : "Pendiente";
    const msg = (l.mensaje ?? "").replace(/[\r\n;]+/g, " ");
    lines.push(`${tipo};${grupo};${l.piso_titulo};${l.nombre};${l.telefono};${msg};${fecha};${estado}`);
  }
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-alquiler-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsAlquilerManager({ leads }: { leads: LeadAlquiler[] }) {
  const router = useRouter();
  const [procesando, setProcesando] = useState<number | null>(null);

  const grupos = leads.filter((l) => l.tipo_interes === "grupo");
  const individuales = leads.filter((l) => l.tipo_interes !== "grupo");

  async function toggleContactado(id: number, actual: boolean) {
    setProcesando(id);
    try {
      await fetch(`/api/admin/leads-alquiler/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactado: !actual }),
      });
      router.refresh();
    } finally {
      setProcesando(null);
    }
  }

  async function borrarLead(id: number) {
    if (!confirm("¿Borrar este lead? Esta acción no se puede deshacer.")) return;
    setProcesando(id);
    try {
      await fetch(`/api/admin/leads-alquiler/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setProcesando(null);
    }
  }

  function Tabla({ items }: { items: LeadAlquiler[] }) {
    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Propiedad</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Mensaje</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} style={l.contactado ? { opacity: 0.55 } : undefined}>
                <td>{new Date(l.created_at).toLocaleString("es-ES")}</td>
                <td>{l.piso_titulo}</td>
                <td>
                  {l.nombre || "—"}
                  {l.tipo_interes === "grupo" && (
                    <span style={{ marginLeft: 6, padding: "1px 7px", background: "#fee2e2", color: "#b91c1c", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                      grupo de {l.grupo_tam ?? "?"}
                    </span>
                  )}
                </td>
                <td><a href={`tel:${l.telefono}`}>{l.telefono}</a></td>
                <td style={{ maxWidth: 260, whiteSpace: "normal" }}>{l.mensaje || "—"}</td>
                <td>
                  {l.contactado ? (
                    <span style={{ padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Contactado</span>
                  ) : (
                    <span style={{ padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>Pendiente</span>
                  )}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    disabled={procesando === l.id}
                    onClick={() => toggleContactado(l.id, !!l.contactado)}
                    style={{ padding: "4px 10px", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12, marginRight: 6 }}
                  >
                    {l.contactado ? "Marcar pendiente" : "Marcar contactado"}
                  </button>
                  <button
                    type="button"
                    disabled={procesando === l.id}
                    onClick={() => borrarLead(l.id)}
                    style={{ padding: "4px 10px", border: "1px solid #fecaca", background: "#fff", color: "#dc2626", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Leads Alquiler</h2>
          <p>{grupos.length} grupo{grupos.length !== 1 ? "s" : ""} · {individuales.length} individual{individuales.length !== 1 ? "es" : ""}</p>
        </div>
        {leads.length > 0 && (
          <button
            type="button"
            onClick={() => descargarExcel(leads)}
            style={{ padding: "8px 18px", borderRadius: 8, background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            Descargar Excel
          </button>
        )}
      </div>

      {leads.length === 0 && <p className="admin-empty">Todavía no hay solicitudes de alquiler.</p>}

      {grupos.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🔥 Grupos</h3>
            <span style={{ padding: "2px 10px", background: "#fee2e2", color: "#b91c1c", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              Prioritarios
            </span>
          </div>
          <Tabla items={grupos} />
        </div>
      )}

      {individuales.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>Individuales</h3>
          <Tabla items={individuales} />
        </div>
      )}
    </>
  );
}
