"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GrupoCasa, LeadCasa } from "../../../lib/leadsCasas";

const ESTADO_LABEL: Record<string, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  alquilada: "Alquilada",
  vendida: "Vendida",
  no_disponible: "No disponible",
  proximamente: "Próximamente",
  eliminado: "Eliminada",
};
const ESTADO_COLOR: Record<string, { bg: string; fg: string }> = {
  disponible: { bg: "#d1fae5", fg: "#065f46" },
  proximamente: { bg: "#fef3c7", fg: "#92400e" },
  reservada: { bg: "#e0e7ff", fg: "#3730a3" },
  alquilada: { bg: "#f3f4f6", fg: "#374151" },
  vendida: { bg: "#f3f4f6", fg: "#374151" },
  no_disponible: { bg: "#f3f4f6", fg: "#374151" },
  eliminado: { bg: "#fee2e2", fg: "#b91c1c" },
};

function descargarExcel(grupos: GrupoCasa[]) {
  const BOM = "﻿";
  const lines: string[] = ["Casa;Estado;Origen;Tipo;Grupo;Nombre;Teléfono;Mensaje;Fecha;Contactado"];
  for (const g of grupos) {
    for (const l of g.leads) {
      const origen = l.fuente === "proximamente" ? "Interés (Próximamente)" : "Quiero Alquilar";
      const tipo = l.tipo_interes === "grupo" ? "Grupo" : l.tipo_interes === "individual" ? "Individual" : "";
      const grupo = l.tipo_interes === "grupo" && l.grupo_tam ? String(l.grupo_tam) : "";
      const msg = (l.mensaje ?? "").replace(/[\r\n;]+/g, " ");
      lines.push(`${g.piso_titulo};${ESTADO_LABEL[g.estado] || g.estado};${origen};${tipo};${grupo};${l.nombre};${l.telefono};${msg};${new Date(l.created_at).toLocaleString("es-ES")};${l.contactado ? "Sí" : "No"}`);
    }
  }
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-casas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsCasasManager({ grupos }: { grupos: GrupoCasa[] }) {
  const router = useRouter();
  const [procesando, setProcesando] = useState<string | null>(null);

  function rutaDe(l: LeadCasa) {
    return l.fuente === "proximamente" ? `/api/admin/leads-proximamente/${l.id}` : `/api/admin/leads-alquiler/${l.id}`;
  }

  async function toggleContactado(l: LeadCasa) {
    const key = `${l.fuente}-${l.id}`;
    setProcesando(key);
    try {
      await fetch(rutaDe(l), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactado: !l.contactado }),
      });
      router.refresh();
    } finally {
      setProcesando(null);
    }
  }

  async function borrarLead(l: LeadCasa) {
    if (!confirm("¿Borrar este lead? Esta acción no se puede deshacer.")) return;
    const key = `${l.fuente}-${l.id}`;
    setProcesando(key);
    try {
      await fetch(rutaDe(l), { method: "DELETE" });
      router.refresh();
    } finally {
      setProcesando(null);
    }
  }

  const totalLeads = grupos.reduce((s, g) => s + g.leads.length, 0);

  return (
    <>
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Leads por casa</h2>
          <p>{totalLeads} interesado{totalLeads !== 1 ? "s" : ""} en {grupos.length} casa{grupos.length !== 1 ? "s" : ""} · Próximamente y Disponible</p>
        </div>
        {totalLeads > 0 && (
          <button
            type="button"
            onClick={() => descargarExcel(grupos)}
            style={{ padding: "8px 18px", borderRadius: 8, background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            Descargar Excel
          </button>
        )}
      </div>

      {grupos.length === 0 && <p className="admin-empty">Todavía no hay leads de ninguna casa.</p>}

      {grupos.map((g) => {
        const c = ESTADO_COLOR[g.estado] || ESTADO_COLOR.no_disponible;
        return (
          <div key={g.piso_id} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{g.piso_titulo}</h3>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: c.bg, color: c.fg }}>
                {ESTADO_LABEL[g.estado] || g.estado}
              </span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                {g.leads.length} interesado{g.leads.length !== 1 ? "s" : ""}
              </span>
              {g.estado === "eliminado" && g.diasParaBorrado != null && (
                <span style={{ fontSize: 12, color: "#b91c1c" }}>
                  · se borra en {g.diasParaBorrado} día{g.diasParaBorrado !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Origen</th>
                    <th>Mensaje</th>
                    <th>Estado</th>
                    <th style={{ textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {g.leads.map((l) => (
                    <tr key={`${l.fuente}-${l.id}`} style={l.contactado ? { opacity: 0.55 } : undefined}>
                      <td>{new Date(l.created_at).toLocaleString("es-ES")}</td>
                      <td>
                        {l.nombre || "—"}
                        {l.tipo_interes === "grupo" && (
                          <span style={{ marginLeft: 6, padding: "1px 7px", background: "#fee2e2", color: "#b91c1c", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                            grupo de {l.grupo_tam ?? "?"}
                          </span>
                        )}
                      </td>
                      <td><a href={`tel:${l.telefono}`}>{l.telefono}</a></td>
                      <td style={{ fontSize: 12 }}>
                        {l.fuente === "proximamente" ? "Interés (Próximamente)" : "Quiero Alquilar"}
                      </td>
                      <td style={{ maxWidth: 240, whiteSpace: "normal" }}>{l.mensaje || "—"}</td>
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
                          disabled={procesando === `${l.fuente}-${l.id}`}
                          onClick={() => toggleContactado(l)}
                          style={{ padding: "4px 10px", border: "1px solid #d1d5db", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12, marginRight: 6 }}
                        >
                          {l.contactado ? "Marcar pendiente" : "Marcar contactado"}
                        </button>
                        <button
                          type="button"
                          disabled={procesando === `${l.fuente}-${l.id}`}
                          onClick={() => borrarLead(l)}
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
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
        El estado es el de la casa en el catálogo (si pasa de Próximamente a Disponible, cambia aquí solo). Al borrar una casa del catálogo, sus leads se eliminan automáticamente a los 10 días.
      </p>
    </>
  );
}
