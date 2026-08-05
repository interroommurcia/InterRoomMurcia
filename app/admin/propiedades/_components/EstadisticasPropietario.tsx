"use client";

import { useEffect, useState } from "react";

type Stats = {
  ganado_propietario: number;
  ganado_nosotros: number;
  total_bruto: number;
  renta_anual_estimada: number;
  rentabilidad_pct: number | null;
  meses_registrados: number;
};

export function EstadisticasPropietario({ propiedadId }: { propiedadId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch(`/api/admin/propiedades/${propiedadId}/estadisticas`).then((r) => r.json()).then(setStats).catch(() => setStats(null));
  }, [propiedadId]);
  if (!stats) return <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>Cargando estadísticas…</div>;
  const eur = (n: number) => `${Math.round(n).toLocaleString("es-ES")}€`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12 }}>
      <StatCard label="Ganado por el propietario" value={eur(stats.ganado_propietario)} sub={`${stats.meses_registrados} meses`} />
      <StatCard label="Ganado nosotros" value={eur(stats.ganado_nosotros)} sub="comisiones" tono="orange" />
      <StatCard label="Renta anual estimada" value={eur(stats.renta_anual_estimada)} sub="12 × precio total" />
      <StatCard label="Rentabilidad bruta" value={stats.rentabilidad_pct !== null ? `${stats.rentabilidad_pct.toFixed(2)}%` : "—"} sub={stats.rentabilidad_pct !== null ? "renta / valor compra" : "añade valor compra"} tono="green" />
    </div>
  );
}

function StatCard({ label, value, sub, tono }: { label: string; value: string; sub?: string; tono?: "orange" | "green" }) {
  const bg = tono === "orange" ? "#fff7ed" : tono === "green" ? "#ecfdf5" : "#f9fafb";
  const color = tono === "orange" ? "#c2410c" : tono === "green" ? "#065f46" : "#111827";
  return (
    <div style={{ background: bg, borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
