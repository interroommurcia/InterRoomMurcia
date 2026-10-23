"use client";

import { useState, useEffect } from "react";
import ConvertirClienteButton from "../ConvertirClienteButton";
import { markLeadsSeen } from "../../../components/LeadsBadge";
import type { Lead } from "../../../lib/leads";
import type { LeadProximamente } from "../../../lib/leadsProximamente";

const CATEGORIAS = [
  { key: "todos", label: "Todos" },
  { key: "propietarios", label: "Propietarios" },
  { key: "inversores", label: "Inversores" },
  { key: "venta", label: "Ventas" },
  { key: "estudiantes", label: "Estudiantes" },
  { key: "luz", label: "Luz" },
  { key: "proximamente", label: "Próximamente" },
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

export type PisoProximamenteItem = { id: string; titulo: string; categoria: string };

function groupByPiso(
  leads: LeadProximamente[],
  pisosProximamente: PisoProximamenteItem[] = [],
) {
  const groups: Record<string, { titulo: string; categoria: string; leads: LeadProximamente[] }> = {};
  for (const p of pisosProximamente) {
    groups[p.id] = { titulo: p.titulo, categoria: p.categoria, leads: [] };
  }
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

export default function LeadsManager({
  leads,
  leadsProximamente,
  pisosProximamente = [],
}: {
  leads: Lead[];
  leadsProximamente: LeadProximamente[];
  pisosProximamente?: PisoProximamenteItem[];
}) {
  const [filtro, setFiltro] = useState<CatKey>("todos");

  useEffect(() => {
    markLeadsSeen();
  }, []);

  const filtered = filtro === "todos"
    ? leads
    : filtro === "proximamente"
    ? []
    : leads.filter((l) => (l.seccion || "propietarios") === filtro);

  const counts: Record<string, number> = {};
  for (const l of leads) {
    const s = l.seccion || "propietarios";
    counts[s] = (counts[s] || 0) + 1;
  }

  const proxGroups = groupByPiso(leadsProximamente, pisosProximamente);

  return (
    <>
      <div className="section-head">
        <h2>Leads</h2>
        <p>{leads.length} solicitudes recibidas{leadsProximamente.length > 0 ? ` · ${leadsProximamente.length} interesados en próximamente` : ""}</p>
      </div>

      <div className="leads-filtros">
        {CATEGORIAS.map((cat) => {
          const count = cat.key === "todos" ? leads.length : cat.key === "proximamente" ? leadsProximamente.length : (counts[cat.key] || 0);
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

      {filtro === "proximamente" ? (
        <>
          {leadsProximamente.length > 0 && (
            <div style={{ marginBottom: 16, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => descargarExcel(leadsProximamente)}
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
            </div>
          )}

          {proxGroups.length === 0 && (
            <p className="admin-empty">No hay propiedades en Próximamente ni interesados registrados.</p>
          )}

          {proxGroups.map(([pisoId, group]) => {
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
                {group.leads.length === 0 ? (
                  <p className="admin-empty" style={{ margin: 0, fontSize: 13 }}>
                    Sin interesados todavía. Comparte el enlace para captar leads.
                  </p>
                ) : (
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
                )}
              </div>
            );
          })}

          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 24 }}>
            Los leads se eliminan automáticamente 15 días después de que la propiedad deje de estar en Próximamente.
          </p>
        </>
      ) : (
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
      )}
    </>
  );
}
