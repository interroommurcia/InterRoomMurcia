"use client";

import { FONT, Filtros, inputStyle } from "./shared";

const TIPOS = [
  { value: "", label: "Todos" },
  { value: "piso", label: "Piso" },
  { value: "casa", label: "Casa" },
  { value: "estudio", label: "Estudio" },
  { value: "chalet", label: "Chalet" },
];

export function FiltroBar({
  filtros,
  onChange,
  total,
  filtrado,
}: {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  total: number;
  filtrado: number;
}) {
  const activo = filtros.libreEnero || filtros.conHabitacionLibre || filtros.tipo !== "" || filtros.minHabitaciones > 0 || filtros.minBanos > 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 18px", marginBottom: 16, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          Filtros
          {activo && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "#6b7280" }}>({filtrado} de {total})</span>}
        </span>
        {activo && (
          <button
            type="button"
            onClick={() => onChange({ libreEnero: false, conHabitacionLibre: false, tipo: "", minHabitaciones: 0, minBanos: 0 })}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--orange)", fontWeight: 500, fontFamily: FONT }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={filtros.libreEnero} onChange={(e) => onChange({ ...filtros, libreEnero: e.target.checked })} />
          <span style={{ background: filtros.libreEnero ? "#fef3c7" : "transparent", padding: "2px 8px", borderRadius: 4, color: filtros.libreEnero ? "#92400e" : "#374151", fontWeight: filtros.libreEnero ? 500 : 400 }}>
            Libre en Enero
          </span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={filtros.conHabitacionLibre} onChange={(e) => onChange({ ...filtros, conHabitacionLibre: e.target.checked })} />
          <span style={{ background: filtros.conHabitacionLibre ? "#d1fae5" : "transparent", padding: "2px 8px", borderRadius: 4, color: filtros.conHabitacionLibre ? "#065f46" : "#374151", fontWeight: filtros.conHabitacionLibre ? 500 : 400 }}>
            Con habitación libre
          </span>
        </label>
        <select
          value={filtros.tipo}
          onChange={(e) => onChange({ ...filtros, tipo: e.target.value })}
          style={{ ...inputStyle, width: "auto", minWidth: 100 }}
        >
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" }}>
          Min. hab
          <input
            type="number" min={0} max={20}
            value={filtros.minHabitaciones || ""}
            onChange={(e) => onChange({ ...filtros, minHabitaciones: Number(e.target.value) || 0 })}
            style={{ ...inputStyle, width: 60 }}
            placeholder="—"
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280" }}>
          Min. baños
          <input
            type="number" min={0} max={10}
            value={filtros.minBanos || ""}
            onChange={(e) => onChange({ ...filtros, minBanos: Number(e.target.value) || 0 })}
            style={{ ...inputStyle, width: 60 }}
            placeholder="—"
          />
        </label>
      </div>
    </div>
  );
}
