"use client";

import { useState } from "react";
import { Cliente, inputStyle } from "./shared";

export function ClienteBuscador({
  clientes,
  value,
  onChange,
  placeholderVacio,
}: {
  clientes: Cliente[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholderVacio: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const seleccionado = clientes.find((c) => c.id === value);
  const filtrados = query
    ? clientes.filter((c) => `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : clientes;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span style={{ color: seleccionado ? "#111827" : "#9ca3af" }}>
          {seleccionado ? `${seleccionado.nombre} ${seleccionado.apellidos ?? ""}`.trim() : placeholderVacio}
        </span>
        <span style={{ color: "#9ca3af", fontSize: 10 }}>▼</span>
      </button>
      {abierto && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 20, maxHeight: 260, overflow: "auto" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            style={{ ...inputStyle, border: "none", borderBottom: "1px solid #e5e7eb", borderRadius: 0, position: "sticky", top: 0, background: "#fff" }}
          />
          <div
            onClick={() => { onChange(null); setAbierto(false); setQuery(""); }}
            style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, color: "#9ca3af", borderBottom: "1px solid #f3f4f6" }}
          >
            {placeholderVacio}
          </div>
          {filtrados.length === 0 ? (
            <div style={{ padding: "12px", fontSize: 12, color: "#9ca3af" }}>Sin resultados.</div>
          ) : (
            filtrados.map((c) => (
              <div
                key={c.id}
                onClick={() => { onChange(c.id); setAbierto(false); setQuery(""); }}
                style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, background: c.id === value ? "#eff6ff" : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = c.id === value ? "#eff6ff" : "transparent")}
              >
                {c.nombre} {c.apellidos ?? ""}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
