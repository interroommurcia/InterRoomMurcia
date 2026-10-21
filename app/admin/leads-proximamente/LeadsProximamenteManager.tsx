"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const groups = groupByPiso(leads);
  const [migrando, setMigrando] = useState(false);
  const [resultadoMig, setResultadoMig] = useState<null | { migrados: number; yaMigrados: number; errores: { id: number; error: string }[] }>(null);
  const [procesando, setProcesando] = useState<number | null>(null);

  async function toggleContactado(id: number, actual: boolean) {
    setProcesando(id);
    try {
      await fetch(`/api/admin/leads-proximamente/${id}`, {
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
      await fetch(`/api/admin/leads-proximamente/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setProcesando(null);
    }
  }

  async function migrarTodos() {
    if (!confirm("¿Mover todos los leads de Próximamente al pipeline normal (leads_propietarios)?\n\nSe conservarán aquí marcados como migrados (no se pierden). La operación es idempotente: si pulsas dos veces, no se duplica.\n\nIMPORTANTE: descarga antes la copia de respaldo (JSON) si aún no lo has hecho.")) return;
    setMigrando(true);
    setResultadoMig(null);
    try {
      const res = await fetch("/api/admin/leads-proximamente/migrar", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert("Error: " + (data.error || res.status)); return; }
      setResultadoMig(data);
    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setMigrando(false);
    }
  }

  return (
    <>
      <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Leads Próximamente</h2>
          <p>{leads.length} interesados en {groups.length} propiedades</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {leads.length > 0 && (
            <>
              <a
                href="/api/admin/leads-proximamente/export"
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  background: "#f3f4f6", color: "#111827",
                  border: "1px solid #d1d5db", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                Copia de respaldo (JSON)
              </a>
              <button
                type="button"
                onClick={() => descargarExcel(leads)}
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  background: "#f3f4f6", color: "#111827",
                  border: "1px solid #d1d5db", cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                }}
              >
                Descargar Excel
              </button>
              <button
                type="button"
                onClick={migrarTodos}
                disabled={migrando}
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  background: "var(--orange)", color: "#fff",
                  border: "none", cursor: migrando ? "wait" : "pointer",
                  fontSize: 14, fontWeight: 600, opacity: migrando ? 0.6 : 1,
                }}
              >
                {migrando ? "Moviendo…" : "Mover al pipeline normal"}
              </button>
            </>
          )}
        </div>
      </div>

      {resultadoMig && (
        <div style={{ margin: "0 0 20px", padding: 12, borderRadius: 8, background: resultadoMig.errores.length ? "#fef3c7" : "#d1fae5", color: resultadoMig.errores.length ? "#92400e" : "#065f46", fontSize: 14 }}>
          <strong>Migración completada.</strong><br />
          Nuevos movidos en esta ejecución: <b>{resultadoMig.migrados}</b> · Ya migrados anteriormente: <b>{resultadoMig.yaMigrados}</b>
          {resultadoMig.errores.length > 0 && (
            <>
              <br />
              <b>Errores ({resultadoMig.errores.length}):</b>
              <ul style={{ margin: "4px 0 0 20px" }}>
                {resultadoMig.errores.map((e) => <li key={e.id}>#{e.id}: {e.error}</li>)}
              </ul>
            </>
          )}
          <br />
          Los leads movidos aparecen ya en <a href="/admin/leads" style={{ color: "inherit", textDecoration: "underline" }}>/admin/leads</a> con origen <code>proximamente</code>.
        </div>
      )}

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
                    <th>Estado</th>
                    <th style={{ textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {group.leads.map((l) => (
                    <tr key={l.id} style={l.contactado ? { opacity: 0.55 } : undefined}>
                      <td>{new Date(l.created_at).toLocaleString("es-ES")}</td>
                      <td>{l.nombre || "—"}</td>
                      <td><a href={`tel:${l.telefono}`}>{l.telefono}</a></td>
                      <td>
                        {l.contactado ? (
                          <span style={{ padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Contactado</span>
                        ) : (
                          <span style={{ padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>Pendiente</span>
                        )}
                        {l.migrated_at && <span style={{ marginLeft: 6, padding: "2px 8px", background: "#e0e7ff", color: "#3730a3", borderRadius: 4, fontSize: 11 }}>En pipeline</span>}
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
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 24 }}>
        Los leads ya no se borran automáticamente. Usa "Marcar contactado" cuando hables con el interesado o "Borrar" si quieres eliminarlo manualmente.
      </p>
    </>
  );
}
