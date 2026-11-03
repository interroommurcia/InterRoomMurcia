"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: "propietario" | "estudiante" | "comprador" | "creditos";
  zona_interes: string | null;
  operacion: "alquiler" | "venta" | null;
  origen: "manual" | "lead" | "autocompletado";
  datos_completados: boolean;
  token: string;
  mensualidad: number;
  comision_pct_alquiler: number;
  comision_fija_alquiler: number | null;
  alquiler_fecha_inicio: string | null;
  alquiler_fecha_fin: string | null;
  tieneIngresos: boolean;
  created_at: string;
};

type Credito = {
  id: string;
  cliente_id: string;
  fecha: string;
  precio: number;
  cobrado?: boolean;
};

type AlquilerComision = {
  id: string;
  cliente_id: string;
  fecha: string;
  precio_alquiler: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado: boolean;
  notas: string | null;
};

type Ingreso = {
  id: string;
  mes: string;
  ingreso_bruto: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado: boolean;
};

type Operacion = {
  id: string;
  cliente_id: string;
  fecha_cierre: string;
  precio_venta: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado?: boolean;
};

type Gasto = {
  id: string;
  concepto: string;
  importe: number;
  es_negativo: boolean;
  pagado: boolean;
  categoria?: string;
};

const CATEGORIAS_GASTO: { value: string; label: string }[] = [
  { value: "propietario", label: "Renta al propietario" },
  { value: "comunidad", label: "Comunidad" },
  { value: "ibi", label: "IBI" },
  { value: "seguro", label: "Seguro" },
  { value: "suministros", label: "Suministros" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "obra", label: "Obra" },
  { value: "reforma", label: "Reforma" },
  { value: "notaria", label: "Notaría" },
  { value: "registro", label: "Registro" },
  { value: "impuestos", label: "Impuestos" },
  { value: "comision", label: "Comisión" },
  { value: "otros", label: "Otros" },
];

function labelCategoria(v: string | undefined) {
  const found = CATEGORIAS_GASTO.find((c) => c.value === v);
  return found ? found.label : "Otros";
}

function netoDeOperacion(comisionCalculada: number, gastos: Gasto[]) {
  return comisionCalculada + gastos.filter((g) => g.pagado).reduce((s, g) => s + (g.es_negativo ? -g.importe : g.importe), 0);
}

type Documento = {
  id: string;
  nombre: string;
  created_at: string;
};

type Balance = {
  comisionBrutaTotal: number;
  beneficioNetoTotal: number;
  pendienteTotal: number;
  alquileres: { comisionBruta: number; cobrado: number; pendiente: number; gastos?: number; neto?: number };
  alquilerComisiones?: { comisionBruta: number; cobrado: number; pendiente: number };
  compraventas: { comisionBruta: number; cobrado: number; pendiente: number; gastos: number; neto: number };
  creditos: { bruto: number; cobrado: number; pendiente: number; neto: number };
  gastosFijos?: {
    mensual: number; anualizado: number; acumulado: number; pctSobreBruto: number; pctSobreNetoOperativo: number;
    fijos?: { mensual: number; anualizado: number; acumulado: number; pctSobreNetoOperativo: number };
    impuestos?: { trimestral: number; mensualEquiv: number; anualizado: number; acumulado: number; pctSobreNetoOperativo: number };
    anuales?: { anual: number; mensualEquiv: number; acumulado: number; pctSobreNetoOperativo: number };
  };
};

type MetricasMes = { mes: number; bruto: number; gastos: number; neto: number; alquileres: number; alquilerComisiones: number; compraventas: number; creditos: number; gastosFijos: number; fijos: number; impuestos: number; anuales: number };

type Metricas = {
  anio: number;
  meses: MetricasMes[];
  mesesAnterior: MetricasMes[];
  trimestres: { trimestre: number; bruto: number; gastos: number; neto: number }[];
  totalAnual: { bruto: number; gastos: number; neto: number; alquileres: number; alquilerComisiones: number; compraventas: number; creditos: number; gastosFijos: number; fijos: number; impuestos: number; anuales: number; netoTrasFijos: number; pctFijosSobreBruto: number; pctFijosSobreNeto: number; pctImpuestosSobreBruto: number; pctImpuestosSobreNeto: number; pctAnualesSobreBruto: number; pctAnualesSobreNeto: number };
  anioAnterior: { bruto: number; neto: number } | null;
  variacion: { brutoPct: number | null; netoPct: number | null };
  aniosDisponibles: number[];
};

type GastoFijo = {
  id: string;
  concepto: string;
  importe_mensual: number;
  categoria: string;
  tipo: "fijo" | "impuesto" | "anual";
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  pagado_por: string | null;
  liquidado: boolean;
  fecha_liquidacion: string | null;
};

type GastoEmpresa = {
  id: string;
  concepto: string;
  importe: number;
  fecha: string;
  categoria: string;
  pagado_por: string | null;
  liquidado: boolean;
  fecha_liquidacion: string | null;
  notas: string | null;
};

type Liquidacion = {
  id: string;
  persona: string;
  importe: number;
  fecha: string;
  concepto: string | null;
};

const NOMBRES_MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function porcentaje(parte: number, total: number) {
  if (!total) return 0;
  return (parte / total) * 100;
}

function variacionPct(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function GraficoEvolucion({ meses }: { meses: MetricasMes[] }) {
  const W = 720;
  const H = 220;
  const PAD_L = 40;
  const PAD_B = 28;
  const PAD_T = 12;
  const PAD_R = 12;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const max = Math.max(1, ...meses.map((m) => m.bruto));
  const barW = chartW / 12;
  const barPad = 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }} role="img" aria-label="Evolución mensual apilada">
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD_T + chartH * (1 - f);
        return <line key={f} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#eee" strokeWidth={1} />;
      })}
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = PAD_T + chartH * (1 - f);
        return (
          <text key={`t${f}`} x={PAD_L - 6} y={y + 3} fontSize={9} textAnchor="end" fill="#999">
            {EUR.format(max * f).replace(/,\d{2}\s?€$/, "€")}
          </text>
        );
      })}
      {meses.map((m, i) => {
        const x = PAD_L + i * barW + barPad / 2;
        const w = barW - barPad;
        const hA = (m.alquileres / max) * chartH;
        const hAC = ((m.alquilerComisiones ?? 0) / max) * chartH;
        const hC = (m.compraventas / max) * chartH;
        const hK = (m.creditos / max) * chartH;
        const yA = PAD_T + chartH - hA;
        const yAC = yA - hAC;
        const yC = yAC - hC;
        const yK = yC - hK;
        return (
          <g key={m.mes}>
            {hA > 0 && <rect x={x} y={yA} width={w} height={hA} fill="#3b82f6" rx={2} />}
            {hAC > 0 && <rect x={x} y={yAC} width={w} height={hAC} fill="#8b5cf6" rx={2} />}
            {hC > 0 && <rect x={x} y={yC} width={w} height={hC} fill="#10b981" rx={2} />}
            {hK > 0 && <rect x={x} y={yK} width={w} height={hK} fill="#f59e0b" rx={2} />}
            <text x={x + w / 2} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">
              {NOMBRES_MES_CORTO[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function fmtCorto(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k€`;
  return `${Math.round(n)}€`;
}

function Donut({ data, size = 180, titulo }: { data: { label: string; value: number; color: string }[]; size?: number; titulo?: string }) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const inner = r * 0.6;
  let acum = 0;
  const segmentos = data.filter((d) => d.value > 0).map((d) => {
    const frac = d.value / (total || 1);
    const a0 = acum * Math.PI * 2 - Math.PI / 2;
    const a1 = (acum + frac) * Math.PI * 2 - Math.PI / 2;
    acum += frac;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi0 = cx + inner * Math.cos(a1), yi0 = cy + inner * Math.sin(a1);
    const xi1 = cx + inner * Math.cos(a0), yi1 = cy + inner * Math.sin(a0);
    const largeArc = frac > 0.5 ? 1 : 0;
    const d_ = `M${x0},${y0} A${r},${r} 0 ${largeArc} 1 ${x1},${y1} L${xi0},${yi0} A${inner},${inner} 0 ${largeArc} 0 ${xi1},${yi1} Z`;
    return { d_, color: d.color, label: d.label, pct: frac * 100, value: d.value };
  });

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eee" strokeWidth={r - inner} />
        ) : segmentos.map((s, i) => <path key={i} d={s.d_} fill={s.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fill="#999">{titulo ?? "Total"}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={14} fontWeight={700} fill="#111">{fmtCorto(total)}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, minWidth: 180 }}>
        {data.map((d) => {
          const pct = total ? (d.value / total) * 100 : 0;
          return (
            <div key={d.label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, background: d.color, borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />{d.label}</span>
              <span style={{ color: "#666" }}>{fmtCorto(d.value)} · {pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Waterfall({ items }: { items: { label: string; value: number; tipo: "inicial" | "positivo" | "negativo" | "final" }[] }) {
  const W = 720, H = 240, PAD_L = 50, PAD_B = 48, PAD_T = 20, PAD_R = 12;
  const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
  const puntos: { base: number; top: number }[] = [];
  let acum = 0;
  items.forEach((it, i) => {
    if (it.tipo === "inicial" || it.tipo === "final") {
      puntos.push({ base: 0, top: it.value });
      acum = it.value;
    } else if (it.tipo === "positivo") {
      puntos.push({ base: acum, top: acum + it.value });
      acum += it.value;
    } else {
      puntos.push({ base: acum - it.value, top: acum });
      acum -= it.value;
    }
    void i;
  });
  const max = Math.max(1, ...puntos.map((p) => p.top));
  const barW = chartW / items.length;
  const pad = 10;
  const py = (v: number) => PAD_T + chartH * (1 - v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={PAD_L} y1={py(max * f)} x2={W - PAD_R} y2={py(max * f)} stroke="#eee" />
          <text x={PAD_L - 6} y={py(max * f) + 3} fontSize={9} textAnchor="end" fill="#999">{fmtCorto(max * f)}</text>
        </g>
      ))}
      {items.map((it, i) => {
        const p = puntos[i];
        const x = PAD_L + i * barW + pad / 2;
        const w = barW - pad;
        const y = py(p.top);
        const h = py(p.base) - py(p.top);
        const color = it.tipo === "inicial" ? "#3b82f6" : it.tipo === "final" ? "#059669" : it.tipo === "positivo" ? "#10b981" : "#ef4444";
        const prev = puntos[i - 1];
        return (
          <g key={it.label}>
            {prev && <line x1={PAD_L + (i - 1) * barW + barW - pad / 2} y1={py(prev.top)} x2={x} y2={py(prev.top)} stroke="#bbb" strokeDasharray="3,3" />}
            <rect x={x} y={y} width={w} height={Math.max(1, h)} fill={color} rx={2} />
            <text x={x + w / 2} y={y - 4} fontSize={10} textAnchor="middle" fill="#333" fontWeight={600}>{fmtCorto(it.value)}</text>
            <text x={x + w / 2} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineaAcumulada({ meses, mesesAnterior, anio, campo, color }: { meses: MetricasMes[]; mesesAnterior: MetricasMes[]; anio: number; campo: "bruto" | "neto"; color: string }) {
  const W = 720, H = 200, PAD_L = 50, PAD_B = 28, PAD_T = 12, PAD_R = 12;
  const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
  const cum = (arr: MetricasMes[]) => arr.reduce<number[]>((acc, m, i) => { acc.push((acc[i - 1] ?? 0) + m[campo]); return acc; }, []);
  const actual = cum(meses);
  const prev = cum(mesesAnterior);
  const max = Math.max(1, ...actual, ...prev);
  const px = (i: number) => PAD_L + (i / 11) * chartW;
  const py = (v: number) => PAD_T + chartH * (1 - v / max);
  const linea = (vs: number[]) => vs.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `${linea(actual)} L${px(11).toFixed(1)},${py(0).toFixed(1)} L${px(0).toFixed(1)},${py(0).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={PAD_L} y1={py(max * f)} x2={W - PAD_R} y2={py(max * f)} stroke="#eee" />
          <text x={PAD_L - 6} y={py(max * f) + 3} fontSize={9} textAnchor="end" fill="#999">{fmtCorto(max * f)}</text>
        </g>
      ))}
      {NOMBRES_MES_CORTO.map((n, i) => (
        <text key={n} x={px(i)} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">{n}</text>
      ))}
      <path d={area} fill={color} opacity={0.1} />
      <path d={linea(prev)} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6,4" />
      <path d={linea(actual)} fill="none" stroke={color} strokeWidth={2.5} />
      {actual.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r={3} fill={color} />)}
      <text x={W - PAD_R - 4} y={py(actual[11]) - 6} fontSize={10} textAnchor="end" fill={color} fontWeight={700}>{fmtCorto(actual[11])} ({anio})</text>
      <text x={W - PAD_R - 4} y={py(prev[11]) - 6} fontSize={10} textAnchor="end" fill="#94a3b8" fontWeight={600}>{fmtCorto(prev[11])} ({anio - 1})</text>
    </svg>
  );
}

function MargenMensual({ meses }: { meses: MetricasMes[] }) {
  const W = 720, H = 180, PAD_L = 50, PAD_B = 28, PAD_T = 20, PAD_R = 12;
  const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
  const margen = meses.map((m) => m.bruto > 0 ? ((m.neto - m.gastosFijos) / m.bruto) * 100 : 0);
  const max = Math.max(100, ...margen);
  const min = Math.min(0, ...margen);
  const rango = max - min || 1;
  const px = (i: number) => PAD_L + (i / 11) * chartW;
  const py = (v: number) => PAD_T + chartH * (1 - (v - min) / rango);
  const linea = margen.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
      {[0, 25, 50, 75, 100].filter((f) => f >= min && f <= max).map((f) => (
        <g key={f}>
          <line x1={PAD_L} y1={py(f)} x2={W - PAD_R} y2={py(f)} stroke={f === 0 ? "#ccc" : "#eee"} />
          <text x={PAD_L - 6} y={py(f) + 3} fontSize={9} textAnchor="end" fill="#999">{f}%</text>
        </g>
      ))}
      {NOMBRES_MES_CORTO.map((n, i) => (
        <text key={n} x={px(i)} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">{n}</text>
      ))}
      <path d={linea} fill="none" stroke="#059669" strokeWidth={2.5} />
      {margen.map((v, i) => meses[i].bruto > 0 && (
        <g key={i}>
          <circle cx={px(i)} cy={py(v)} r={3} fill="#059669" />
          <text x={px(i)} y={py(v) - 6} fontSize={9} textAnchor="middle" fill="#059669" fontWeight={600}>{v.toFixed(0)}%</text>
        </g>
      ))}
    </svg>
  );
}

function BarrasHorizontales({ data, color = "#3b82f6", formato = "euro" }: { data: { label: string; value: number }[]; color?: string; formato?: "euro" | "numero" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ color: "#333", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{d.label}</span>
          <div style={{ background: "#f1f5f9", borderRadius: 4, height: 18, position: "relative" }}>
            <div style={{ background: color, height: "100%", width: `${(d.value / max) * 100}%`, borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <span style={{ textAlign: "right", color: "#666", fontWeight: 600 }}>{formato === "euro" ? fmtCorto(d.value) : d.value.toLocaleString("es-ES")}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ values, color = "#3b82f6", width = 100, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const rango = max - min || 1;
  const px = (i: number) => (i / Math.max(1, values.length - 1)) * (width - 4) + 2;
  const py = (v: number) => height - 2 - ((v - min) / rango) * (height - 4);
  const linea = values.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `${linea} L${px(values.length - 1).toFixed(1)},${height - 2} L${px(0).toFixed(1)},${height - 2} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <path d={area} fill={color} opacity={0.15} />
      <path d={linea} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function Heatmap({ meses }: { meses: MetricasMes[] }) {
  const lineas: { key: keyof MetricasMes; label: string; color: string }[] = [
    { key: "alquileres", label: "Gestión alq.", color: "#3b82f6" },
    { key: "alquilerComisiones", label: "Comisión alq.", color: "#8b5cf6" },
    { key: "compraventas", label: "Compraventas", color: "#10b981" },
    { key: "creditos", label: "Créditos", color: "#f59e0b" },
  ];
  const max: Record<string, number> = {};
  lineas.forEach((l) => { max[l.key as string] = Math.max(1, ...meses.map((m) => (m[l.key] as number) || 0)); });
  const cellW = 48, cellH = 32;
  const W = cellW * 13 + 10, H = cellH * lineas.length + 20;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
      {NOMBRES_MES_CORTO.map((n, i) => (
        <text key={n} x={cellW + i * cellW + cellW / 2} y={14} fontSize={10} textAnchor="middle" fill="#666">{n}</text>
      ))}
      {lineas.map((l, r) => (
        <g key={l.key as string}>
          <text x={cellW - 8} y={20 + r * cellH + cellH / 2 + 4} fontSize={10} textAnchor="end" fill="#333">{l.label}</text>
          {meses.map((m, i) => {
            const v = (m[l.key] as number) || 0;
            const intensidad = v / max[l.key as string];
            return (
              <g key={i}>
                <rect x={cellW + i * cellW + 2} y={20 + r * cellH + 2} width={cellW - 4} height={cellH - 4} fill={l.color} opacity={0.1 + intensidad * 0.85} rx={3} />
                {v > 0 && <text x={cellW + i * cellW + cellW / 2} y={20 + r * cellH + cellH / 2 + 4} fontSize={9} textAnchor="middle" fill={intensidad > 0.5 ? "#fff" : "#333"} fontWeight={600}>{fmtCorto(v)}</text>}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function fmt(n: number) {
  return EUR.format(n || 0);
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  const signo = n > 0 ? "+" : "";
  return `${signo}${n.toFixed(1)}%`;
}

const ACTIVAR_ALQUILER = { cliente_id: "", mensualidad: "", comision_pct: "15", comision_fija: "", fecha_inicio: "", fecha_fin: "" };

function añoActual(mes: string) {
  return new Date(mes).getUTCFullYear();
}

export default function ContabilidadManager() {
  const [tab, setTab] = useState<"metricas" | "creditos" | "alquileres" | "compraventas" | "gastos">("creditos");
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [mostrarNuevoFijo, setMostrarNuevoFijo] = useState(false);
  const [nuevoFijo, setNuevoFijo] = useState({ concepto: "", importe_mensual: "", categoria: "otros", tipo: "fijo" as "fijo" | "impuesto" | "anual", fecha_inicio: new Date().toISOString().slice(0, 10), pagado_por: "" });
  const [editandoFijo, setEditandoFijo] = useState<string | null>(null);
  const [edicionFijo, setEdicionFijo] = useState({ concepto: "", importe_mensual: "", categoria: "", tipo: "fijo" as "fijo" | "impuesto" | "anual", pagado_por: "" });
  const [gastoFijoDocumentos, setGastoFijoDocumentos] = useState<Record<string, Documento[]>>({});
  const [subiendoDocGastoFijo, setSubiendoDocGastoFijo] = useState(false);

  const [gastosEmpresa, setGastosEmpresa] = useState<GastoEmpresa[]>([]);
  const [mostrarNuevoGastoEmpresa, setMostrarNuevoGastoEmpresa] = useState(false);
  const [nuevoGastoEmpresa, setNuevoGastoEmpresa] = useState({ concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10), categoria: "otros", pagado_por: "" });
  const [editandoEmpresa, setEditandoEmpresa] = useState<string | null>(null);
  const [edicionEmpresa, setEdicionEmpresa] = useState({ concepto: "", importe: "", fecha: "", categoria: "", pagado_por: "" });

  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [nuevaLiquidacion, setNuevaLiquidacion] = useState({ persona: "", importe: "", fecha: new Date().toISOString().slice(0, 10), concepto: "" });
  const [mostrarNuevaLiquidacion, setMostrarNuevaLiquidacion] = useState(false);
  const [personaExpandida, setPersonaExpandida] = useState<string | null>(null);
  const [lineasSeleccionadas, setLineasSeleccionadas] = useState<Set<string>>(new Set());
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [metricasAnio, setMetricasAnio] = useState(new Date().getFullYear());
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);

  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [nuevaOperacionCredito, setNuevaOperacionCredito] = useState({ cliente_id: "", fecha: "", precio: "" });
  const [mostrarNuevaOperacionCredito, setMostrarNuevaOperacionCredito] = useState(false);
  const [creditoGastos, setCreditoGastos] = useState<Record<string, Gasto[]>>({});
  const [creditoDocumentos, setCreditoDocumentos] = useState<Record<string, Documento[]>>({});
  const [creditoAbierto, setCreditoAbierto] = useState<string | null>(null);
  const [nuevoGastoCredito, setNuevoGastoCredito] = useState({ concepto: "", importe: "", categoria: "otros" });
  const [subiendoDocumentoCredito, setSubiendoDocumentoCredito] = useState(false);

  const [alquilerComisiones, setAlquilerComisiones] = useState<AlquilerComision[]>([]);
  const [mostrarNuevaAlquilerComision, setMostrarNuevaAlquilerComision] = useState(false);
  const [nuevaAlquilerComision, setNuevaAlquilerComision] = useState({ cliente_id: "", fecha: "", precio_alquiler: "", comision_pct: "15" });
  const [editandoAC, setEditandoAC] = useState<string | null>(null);
  const [editACForm, setEditACForm] = useState({ cliente_id: "", fecha: "", precio_alquiler: "", comision_pct: "", notas: "" });
  const [subTabAlquileres, setSubTabAlquileres] = useState<"gestion" | "comision">("gestion");

  const [activarAlquiler, setActivarAlquiler] = useState(ACTIVAR_ALQUILER);
  const [mostrarActivarAlquiler, setMostrarActivarAlquiler] = useState(false);

  const [ingresos, setIngresos] = useState<Record<string, Ingreso[]>>({});

  const [gastos, setGastos] = useState<Record<string, Gasto[]>>({});
  const [operacionAbierta, setOperacionAbierta] = useState<string | null>(null);
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", importe: "", categoria: "otros" });

  const [documentos, setDocumentos] = useState<Record<string, Documento[]>>({});
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);

  const [nuevaOperacion, setNuevaOperacion] = useState({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
  const [mostrarNuevaOperacion, setMostrarNuevaOperacion] = useState(false);
  const [editandoOp, setEditandoOp] = useState<string | null>(null);
  const [edicionOp, setEdicionOp] = useState({ comision_calculada: "", comision_pct: "", precio_venta: "" });

  async function cargarTodo() {
    const [c, o, cr, b, gf, ge, lq, ac] = await Promise.all([
      fetch("/api/admin/clientes").then((r) => r.json()),
      fetch("/api/admin/operaciones").then((r) => r.json()),
      fetch("/api/admin/creditos").then((r) => r.json()),
      fetch("/api/admin/contabilidad/balance").then((r) => r.json()),
      fetch("/api/admin/gastos-fijos").then((r) => r.json()),
      fetch("/api/admin/gastos-empresa").then((r) => r.json()),
      fetch("/api/admin/liquidaciones").then((r) => r.json()),
      fetch("/api/admin/alquiler-comisiones").then((r) => r.json()),
    ]);
    setClientes(Array.isArray(c) ? c : []);
    setOperaciones(Array.isArray(o) ? o : []);
    setCreditos(Array.isArray(cr) ? cr : []);
    setBalance(b?.comisionBrutaTotal !== undefined ? b : null);
    setGastosFijos(Array.isArray(gf) ? gf : []);
    setGastosEmpresa(Array.isArray(ge) ? ge : []);
    setLiquidaciones(Array.isArray(lq) ? lq : []);
    setAlquilerComisiones(Array.isArray(ac) ? ac : []);
    setLoading(false);

    const clientesList: Cliente[] = Array.isArray(c) ? c : [];
    const conAlquiler = clientesList.filter((cl) => cl.tipo === "propietario" && (cl.mensualidad > 0 || cl.tieneIngresos));
    const pares = await Promise.all(conAlquiler.map(async (cl) => {
      const data = await fetch(`/api/admin/clientes/${cl.id}/ingresos`).then((r) => r.json()).catch(() => []);
      return [cl.id, Array.isArray(data) ? data : []] as const;
    }));
    setIngresos(Object.fromEntries(pares));
  }

  async function crearGastoFijo(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoFijo.concepto || !nuevoFijo.importe_mensual) return;
    await fetch("/api/admin/gastos-fijos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: nuevoFijo.concepto,
        importe_mensual: Number(nuevoFijo.importe_mensual),
        categoria: nuevoFijo.categoria,
        tipo: nuevoFijo.tipo,
        fecha_inicio: nuevoFijo.fecha_inicio,
        pagado_por: nuevoFijo.pagado_por || null,
      }),
    });
    setNuevoFijo({ concepto: "", importe_mensual: "", categoria: "otros", tipo: "fijo" as "fijo" | "impuesto" | "anual", fecha_inicio: new Date().toISOString().slice(0, 10), pagado_por: "" });
    setMostrarNuevoFijo(false);
    cargarTodo();
  }

  async function guardarEdicionFijo(id: string) {
    await fetch(`/api/admin/gastos-fijos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: edicionFijo.concepto,
        importe_mensual: Number(edicionFijo.importe_mensual),
        categoria: edicionFijo.categoria,
        tipo: edicionFijo.tipo,
        pagado_por: edicionFijo.pagado_por || null,
      }),
    });
    setEditandoFijo(null);
    cargarTodo();
  }

  async function subirDocumentoGastoFijo(gastoId: string, file: File) {
    setSubiendoDocGastoFijo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/gastos-fijos/${gastoId}/documentos`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error subiendo documento: ${err.error || res.statusText}`);
        return;
      }
      const data = await fetch(`/api/admin/gastos-fijos/${gastoId}/documentos`).then((r) => r.json());
      setGastoFijoDocumentos((prev) => ({ ...prev, [gastoId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      alert(`Error subiendo documento: ${e instanceof Error ? e.message : "Error desconocido"}`);
    } finally {
      setSubiendoDocGastoFijo(false);
    }
  }

  async function eliminarDocumentoGastoFijo(gastoId: string, docId: string) {
    await fetch(`/api/admin/gastos-fijos/${gastoId}/documentos/${docId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/gastos-fijos/${gastoId}/documentos`).then((r) => r.json());
    setGastoFijoDocumentos((prev) => ({ ...prev, [gastoId]: Array.isArray(data) ? data : [] }));
  }

  async function crearGastoEmpresaFn(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGastoEmpresa.concepto || !nuevoGastoEmpresa.importe) return;
    await fetch("/api/admin/gastos-empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: nuevoGastoEmpresa.concepto,
        importe: Number(nuevoGastoEmpresa.importe),
        fecha: nuevoGastoEmpresa.fecha,
        categoria: nuevoGastoEmpresa.categoria,
        pagado_por: nuevoGastoEmpresa.pagado_por || null,
      }),
    });
    setNuevoGastoEmpresa({ concepto: "", importe: "", fecha: new Date().toISOString().slice(0, 10), categoria: "otros", pagado_por: "" });
    setMostrarNuevoGastoEmpresa(false);
    cargarTodo();
  }

  async function guardarEdicionEmpresa(id: string) {
    if (!confirm("¿Estás seguro de que quieres guardar los cambios?")) return;
    await fetch(`/api/admin/gastos-empresa/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: edicionEmpresa.concepto,
        importe: Number(edicionEmpresa.importe),
        fecha: edicionEmpresa.fecha,
        categoria: edicionEmpresa.categoria,
        pagado_por: edicionEmpresa.pagado_por || null,
      }),
    });
    setEditandoEmpresa(null);
    cargarTodo();
  }

  async function eliminarGastoEmpresaFn(id: string) {
    if (!confirm("¿Borrar este gasto?")) return;
    await fetch(`/api/admin/gastos-empresa/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function crearLiquidacionFn(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaLiquidacion.persona || !nuevaLiquidacion.importe) return;
    await fetch("/api/admin/liquidaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: nuevaLiquidacion.persona,
        importe: Number(nuevaLiquidacion.importe),
        fecha: nuevaLiquidacion.fecha,
        concepto: nuevaLiquidacion.concepto || null,
      }),
    });
    setNuevaLiquidacion({ persona: "", importe: "", fecha: new Date().toISOString().slice(0, 10), concepto: "" });
    setMostrarNuevaLiquidacion(false);
    cargarTodo();
  }

  async function eliminarLiquidacionFn(id: string) {
    if (!confirm("¿Borrar esta liquidación?")) return;
    await fetch(`/api/admin/liquidaciones/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function terminarGastoFijo(id: string) {
    const fecha = prompt("Fecha de fin (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!fecha) return;
    await fetch(`/api/admin/gastos-fijos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha_fin: fecha }),
    });
    cargarTodo();
  }

  async function eliminarGastoFijo(id: string) {
    if (!confirm("¿Borrar este gasto fijo?")) return;
    await fetch(`/api/admin/gastos-fijos/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  useEffect(() => {
    (async () => {
      await fetch("/api/admin/contabilidad/generar-mensualidades", { method: "POST" }).catch(() => null);
      cargarTodo();
    })();
  }, []);

  useEffect(() => {
    if (tab !== "alquileres") return;
    fetch("/api/admin/contabilidad/generar-mensualidades", { method: "POST" })
      .then(() => cargarTodo())
      .catch(() => null);
  }, [tab]);

  useEffect(() => {
    if (tab !== "metricas") return;
    if (metricas && metricas.anio === metricasAnio) return;
    setCargandoMetricas(true);
    fetch(`/api/admin/contabilidad/metricas?anio=${metricasAnio}`)
      .then((r) => r.json())
      .then((data) => setMetricas(data?.anio !== undefined ? data : null))
      .finally(() => setCargandoMetricas(false));
  }, [tab, metricasAnio, metricas]);

  async function crearOperacionCredito(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOperacionCredito.cliente_id || !nuevaOperacionCredito.fecha || !nuevaOperacionCredito.precio) return;
    await fetch("/api/admin/creditos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaOperacionCredito.cliente_id,
        fecha: nuevaOperacionCredito.fecha,
        precio: Number(nuevaOperacionCredito.precio),
      }),
    });
    setNuevaOperacionCredito({ cliente_id: "", fecha: "", precio: "" });
    setMostrarNuevaOperacionCredito(false);
    cargarTodo();
  }

  async function eliminarOperacionCredito(id: string) {
    await fetch(`/api/admin/creditos/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function toggleCredito(credito: Credito) {
    const next = creditoAbierto === credito.id ? null : credito.id;
    setCreditoAbierto(next);
    if (next && !creditoGastos[credito.id]) {
      const data = await fetch(`/api/admin/creditos/${credito.id}/gastos`).then((r) => r.json());
      setCreditoGastos((prev) => ({ ...prev, [credito.id]: Array.isArray(data) ? data : [] }));
    }
    if (next && !creditoDocumentos[credito.id]) {
      const data = await fetch(`/api/admin/creditos/${credito.id}/documentos`).then((r) => r.json());
      setCreditoDocumentos((prev) => ({ ...prev, [credito.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function añadirGastoCredito(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGastoCredito.concepto || !nuevoGastoCredito.importe) return;
    await fetch(`/api/admin/creditos/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGastoCredito.concepto, importe: Number(nuevoGastoCredito.importe), es_negativo: true, categoria: nuevoGastoCredito.categoria }),
    });
    setNuevoGastoCredito({ concepto: "", importe: "", categoria: "otros" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleGastoCreditoPagado(operacionId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/credito-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function eliminarGastoCredito(operacionId: string, gastoId: string) {
    await fetch(`/api/admin/credito-gastos/${gastoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function subirDocumentoCredito(operacionId: string, file: File) {
    setSubiendoDocumentoCredito(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/creditos/${operacionId}/documentos`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error subiendo documento: ${err.error || res.statusText}`);
        return;
      }
      const data = await fetch(`/api/admin/creditos/${operacionId}/documentos`).then((r) => r.json());
      setCreditoDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      alert(`Error subiendo documento: ${e instanceof Error ? e.message : "Error desconocido"}`);
    } finally {
      setSubiendoDocumentoCredito(false);
    }
  }

  async function eliminarDocumentoCredito(operacionId: string, documentoId: string) {
    await fetch(`/api/admin/credito-documentos/${documentoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/documentos`).then((r) => r.json());
    setCreditoDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function activarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!activarAlquiler.cliente_id || !activarAlquiler.mensualidad) return;
    await fetch(`/api/admin/clientes/${activarAlquiler.cliente_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensualidad: Number(activarAlquiler.mensualidad) || 0,
        comision_pct_alquiler: Number(activarAlquiler.comision_pct) || 15,
        comision_fija_alquiler: activarAlquiler.comision_fija ? Number(activarAlquiler.comision_fija) : null,
        alquiler_fecha_inicio: activarAlquiler.fecha_inicio || null,
        alquiler_fecha_fin: activarAlquiler.fecha_fin || null,
      }),
    });
    setActivarAlquiler(ACTIVAR_ALQUILER);
    setMostrarActivarAlquiler(false);
    await fetch("/api/admin/contabilidad/generar-mensualidades", { method: "POST" });
    cargarTodo();
  }


  async function crearAlquilerComisionFn(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaAlquilerComision.cliente_id || !nuevaAlquilerComision.fecha || !nuevaAlquilerComision.precio_alquiler) return;
    await fetch("/api/admin/alquiler-comisiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaAlquilerComision.cliente_id,
        fecha: nuevaAlquilerComision.fecha,
        precio_alquiler: Number(nuevaAlquilerComision.precio_alquiler),
        comision_pct: Number(nuevaAlquilerComision.comision_pct),
      }),
    });
    setNuevaAlquilerComision({ cliente_id: "", fecha: "", precio_alquiler: "", comision_pct: "15" });
    setMostrarNuevaAlquilerComision(false);
    cargarTodo();
  }

  async function eliminarAlquilerComisionFn(id: string) {
    if (!confirm("¿Borrar esta operación de comisión?")) return;
    await fetch(`/api/admin/alquiler-comisiones/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function toggleAlquilerComisionCobrado(id: string, cobrado: boolean) {
    await fetch(`/api/admin/alquiler-comisiones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cobrado }),
    });
    cargarTodo();
  }

  function iniciarEdicionAC(ac: AlquilerComision) {
    setEditandoAC(ac.id);
    setEditACForm({
      cliente_id: ac.cliente_id,
      fecha: ac.fecha,
      precio_alquiler: String(ac.precio_alquiler),
      comision_pct: String(ac.comision_pct),
      notas: ac.notas ?? "",
    });
  }

  async function guardarEdicionAC(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoAC) return;
    await fetch(`/api/admin/alquiler-comisiones/${editandoAC}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: editACForm.cliente_id,
        fecha: editACForm.fecha,
        precio_alquiler: Number(editACForm.precio_alquiler),
        comision_pct: Number(editACForm.comision_pct),
        notas: editACForm.notas || null,
      }),
    });
    setEditandoAC(null);
    cargarTodo();
  }


  async function crearOperacion(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOperacion.cliente_id || !nuevaOperacion.fecha_cierre || !nuevaOperacion.precio_venta) return;
    await fetch("/api/admin/operaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaOperacion.cliente_id,
        fecha_cierre: nuevaOperacion.fecha_cierre,
        precio_venta: Number(nuevaOperacion.precio_venta),
        comision_pct: Number(nuevaOperacion.comision_pct),
      }),
    });
    setNuevaOperacion({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
    setMostrarNuevaOperacion(false);
    cargarTodo();
  }

  async function eliminarOperacion(id: string) {
    await fetch(`/api/admin/operaciones/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  function abrirEdicionOp(op: Operacion) {
    if (editandoOp === op.id) {
      setEditandoOp(null);
      return;
    }
    setEditandoOp(op.id);
    setEdicionOp({
      comision_calculada: String(op.comision_calculada ?? ""),
      comision_pct: String(op.comision_pct ?? ""),
      precio_venta: String(op.precio_venta ?? ""),
    });
  }

  async function guardarEdicionOp(id: string, modo: "manual" | "recalcular") {
    const body: Record<string, number> = {};
    if (modo === "manual") {
      body.comision_calculada = Number(edicionOp.comision_calculada);
    } else {
      body.precio_venta = Number(edicionOp.precio_venta);
      body.comision_pct = Number(edicionOp.comision_pct);
    }
    await fetch(`/api/admin/operaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditandoOp(null);
    cargarTodo();
  }

  async function toggleOperacion(operacion: Operacion) {
    const next = operacionAbierta === operacion.id ? null : operacion.id;
    setOperacionAbierta(next);
    if (next && !gastos[operacion.id]) {
      const data = await fetch(`/api/admin/operaciones/${operacion.id}/gastos`).then((r) => r.json());
      setGastos((prev) => ({ ...prev, [operacion.id]: Array.isArray(data) ? data : [] }));
    }
    if (next && !documentos[operacion.id]) {
      const data = await fetch(`/api/admin/operaciones/${operacion.id}/documentos`).then((r) => r.json());
      setDocumentos((prev) => ({ ...prev, [operacion.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function subirDocumento(operacionId: string, file: File) {
    setSubiendoDocumento(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/operaciones/${operacionId}/documentos`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error subiendo documento: ${err.error || res.statusText}`);
        return;
      }
      const data = await fetch(`/api/admin/operaciones/${operacionId}/documentos`).then((r) => r.json());
      setDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      alert(`Error subiendo documento: ${e instanceof Error ? e.message : "Error desconocido"}`);
    } finally {
      setSubiendoDocumento(false);
    }
  }

  async function eliminarDocumento(operacionId: string, documentoId: string) {
    await fetch(`/api/admin/documentos/${documentoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/documentos`).then((r) => r.json());
    setDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function añadirGasto(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.importe) return;
    await fetch(`/api/admin/operaciones/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGasto.concepto, importe: Number(nuevoGasto.importe), es_negativo: true, categoria: nuevoGasto.categoria }),
    });
    setNuevoGasto({ concepto: "", importe: "", categoria: "otros" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleGastoPagado(operacionId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function eliminarGasto(operacionId: string, gastoId: string) {
    await fetch(`/api/admin/gastos/${gastoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  const clienteNombre = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombre} ${c.apellidos ?? ""}`.trim() : "—";
  };

  const clientesConAlquiler = clientes.filter((c) => c.tipo === "propietario" && (c.mensualidad > 0 || c.tieneIngresos));
  const propietariosInactivos = clientes.filter((c) => c.tipo === "propietario" && !(c.mensualidad > 0 || c.tieneIngresos));

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      {balance && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Comisión bruta total</h3>
            <div className="analytics-stat-value">{fmt(balance.comisionBrutaTotal)}</div>
            <p>Cobrado {fmt(balance.comisionBrutaTotal - (balance.pendienteTotal ?? 0))} · <b style={{ color: (balance.pendienteTotal ?? 0) > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.pendienteTotal ?? 0)}</b></p>
          </div>
          <div className="analytics-card">
            <h3>Beneficio neto total</h3>
            <div className="analytics-stat-value">{fmt(balance.beneficioNetoTotal)}</div>
            <p>Compraventas netas {fmt(balance.compraventas.neto)} (gastos {fmt(balance.compraventas.gastos)}) · Créditos netos {fmt(balance.creditos.neto)}</p>
          </div>
          <div className="analytics-card" style={{ borderLeft: "3px solid #3b82f6" }}>
            <h3>Alquileres en gestión</h3>
            <div className="analytics-stat-value">{fmt(balance.alquileres.comisionBruta)}</div>
            <p>Cobrado {fmt(balance.alquileres.cobrado)} · <b style={{ color: balance.alquileres.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.alquileres.pendiente)}</b></p>
            {clientesConAlquiler.length > 0 && (() => {
              const estMensual = clientesConAlquiler.reduce((sum, c) => {
                const com = c.comision_fija_alquiler != null && c.comision_fija_alquiler > 0
                  ? c.comision_fija_alquiler
                  : c.mensualidad * ((c.comision_pct_alquiler ?? 15) / 100);
                return sum + com;
              }, 0);
              return <p style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>Estimación: <b>{fmt(Math.round(estMensual))}/mes</b> · {fmt(Math.round(estMensual * 12))}/año ({clientesConAlquiler.length} propiedades)</p>;
            })()}
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{porcentaje(balance.alquileres.comisionBruta, balance.comisionBrutaTotal).toFixed(1)}% del beneficio total</p>
          </div>
          {balance.alquilerComisiones && balance.alquilerComisiones.comisionBruta > 0 && (
            <div className="analytics-card" style={{ borderLeft: "3px solid #8b5cf6" }}>
              <h3>Alquileres comisión</h3>
              <div className="analytics-stat-value">{fmt(balance.alquilerComisiones.comisionBruta)}</div>
              <p>Cobrado {fmt(balance.alquilerComisiones.cobrado)} · <b style={{ color: balance.alquilerComisiones.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.alquilerComisiones.pendiente)}</b></p>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{porcentaje(balance.alquilerComisiones.comisionBruta, balance.comisionBrutaTotal).toFixed(1)}% del beneficio total</p>
            </div>
          )}
          <div className="analytics-card" style={{ borderLeft: "3px solid #10b981" }}>
            <h3>Compraventas</h3>
            <div className="analytics-stat-value">{fmt(balance.compraventas.comisionBruta)}</div>
            <p>Cobrado {fmt(balance.compraventas.cobrado)} · <b style={{ color: balance.compraventas.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.compraventas.pendiente)}</b></p>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{porcentaje(balance.compraventas.comisionBruta, balance.comisionBrutaTotal).toFixed(1)}% del beneficio total</p>
          </div>
          <div className="analytics-card" style={{ borderLeft: "3px solid #8b5cf6" }}>
            <h3>Compra de créditos</h3>
            <div className="analytics-stat-value">{fmt(balance.creditos.bruto)}</div>
            <p>Cobrado {fmt(balance.creditos.cobrado)} · <b style={{ color: balance.creditos.pendiente > 0 ? "#c2410c" : undefined }}>Pendiente {fmt(balance.creditos.pendiente)}</b></p>
          </div>
          {balance.gastosFijos?.fijos && (
            <div className="analytics-card" style={{ borderLeft: "3px solid #ef4444" }}>
              <h3>Gastos fijos empresa</h3>
              <div className="analytics-stat-value">{fmt(balance.gastosFijos.fijos.mensual)}/mes</div>
              <p>
                Anualizado {fmt(balance.gastosFijos.fijos.anualizado)} · Acumulado {fmt(balance.gastosFijos.fijos.acumulado)} ·{" "}
                {balance.gastosFijos.fijos.pctSobreNetoOperativo.toFixed(1)}% del beneficio operativo
              </p>
            </div>
          )}
          {balance.gastosFijos?.impuestos && (
            <div className="analytics-card" style={{ borderLeft: "3px solid #f59e0b" }}>
              <h3>Impuestos trimestre</h3>
              <div className="analytics-stat-value">{fmt(balance.gastosFijos.impuestos.trimestral)}/trim</div>
              <p>
                Media {fmt(balance.gastosFijos.impuestos.mensualEquiv)}/mes · Anual {fmt(balance.gastosFijos.impuestos.anualizado)} · Acumulado {fmt(balance.gastosFijos.impuestos.acumulado)} ·{" "}
                {balance.gastosFijos.impuestos.pctSobreNetoOperativo.toFixed(1)}% del beneficio operativo
              </p>
            </div>
          )}
          {balance.gastosFijos?.anuales && balance.gastosFijos.anuales.anual > 0 && (
            <div className="analytics-card" style={{ borderLeft: "3px solid #7c3aed" }}>
              <h3>Suscripciones anuales</h3>
              <div className="analytics-stat-value">{fmt(balance.gastosFijos.anuales.anual)}/año</div>
              <p>
                Media {fmt(balance.gastosFijos.anuales.mensualEquiv)}/mes · Acumulado {fmt(balance.gastosFijos.anuales.acumulado)} ·{" "}
                {balance.gastosFijos.anuales.pctSobreNetoOperativo.toFixed(1)}% del beneficio operativo
              </p>
            </div>
          )}
        </div>
      )}

      <div className="contabilidad-tabs">
        <button type="button" className={`contabilidad-tab${tab === "metricas" ? " active" : ""}`} onClick={() => setTab("metricas")}>
          Métricas
        </button>
        <button type="button" className={`contabilidad-tab${tab === "creditos" ? " active" : ""}`} onClick={() => setTab("creditos")}>
          Compra de Créditos
        </button>
        <button type="button" className={`contabilidad-tab${tab === "alquileres" ? " active" : ""}`} onClick={() => setTab("alquileres")}>
          Alquileres
        </button>
        <button type="button" className={`contabilidad-tab${tab === "compraventas" ? " active" : ""}`} onClick={() => setTab("compraventas")}>
          Compraventas
        </button>
        <button type="button" className={`contabilidad-tab${tab === "gastos" ? " active" : ""}`} onClick={() => setTab("gastos")}>
          Gastos
        </button>
      </div>

      {tab === "metricas" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Métricas {metricasAnio}</h2>
            <label>
              Año
              <select value={metricasAnio} onChange={(e) => setMetricasAnio(Number(e.target.value))} style={{ marginLeft: 8 }}>
                {(metricas?.aniosDisponibles ?? [new Date().getFullYear()]).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>

          {cargandoMetricas || !metricas ? (
            <p className="admin-empty">Cargando métricas...</p>
          ) : (
            <>
              {/* Cards por línea de negocio */}
              <div className="analytics-grid">
                <div className="analytics-card" style={{ borderLeft: "3px solid #3b82f6" }}>
                  <h3>Gestión de alquileres</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.alquileres)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.alquileres)} color="#3b82f6" />
                  <p>
                    {porcentaje(metricas.totalAnual.alquileres, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.alquileres, metricas.mesesAnterior.reduce((s, m) => s + m.alquileres, 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #8b5cf6" }}>
                  <h3>Alquileres comisión</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.alquilerComisiones)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.alquilerComisiones ?? 0)} color="#8b5cf6" />
                  <p>
                    {porcentaje(metricas.totalAnual.alquilerComisiones, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.alquilerComisiones, metricas.mesesAnterior.reduce((s, m) => s + (m.alquilerComisiones ?? 0), 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #10b981" }}>
                  <h3>Compraventas</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.compraventas)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.compraventas)} color="#10b981" />
                  <p>
                    {porcentaje(metricas.totalAnual.compraventas, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.compraventas, metricas.mesesAnterior.reduce((s, m) => s + m.compraventas, 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #f59e0b" }}>
                  <h3>Créditos</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.creditos)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.creditos)} color="#f59e0b" />
                  <p>
                    {porcentaje(metricas.totalAnual.creditos, metricas.totalAnual.bruto).toFixed(1)}% del total ·{" "}
                    {fmtPct(variacionPct(metricas.totalAnual.creditos, metricas.mesesAnterior.reduce((s, m) => s + m.creditos, 0)))} vs {metricasAnio - 1}
                  </p>
                </div>
              </div>

              {/* Cards totales */}
              <div className="analytics-grid" style={{ marginTop: 12 }}>
                <div className="analytics-card">
                  <h3>Facturación bruta</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.bruto)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.bruto)} color="#3b82f6" />
                  <p>
                    {metricas.anioAnterior ? `${fmtPct(metricas.variacion.brutoPct)} vs ${metricasAnio - 1}` : `Sin datos de ${metricasAnio - 1}`}
                  </p>
                </div>
                <div className="analytics-card">
                  <h3>Gastos liquidados</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.gastos)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.gastos)} color="#ef4444" />
                  <p>Imputados al mes en que se pagaron</p>
                </div>
                <div className="analytics-card">
                  <h3>Beneficio neto</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.neto)}</div>
                  <Sparkline values={metricas.meses.map((m) => m.neto)} color="#059669" />
                  <p>
                    {metricas.anioAnterior ? `${fmtPct(metricas.variacion.netoPct)} vs ${metricasAnio - 1}` : `Sin datos de ${metricasAnio - 1}`}
                  </p>
                </div>
              </div>

              <div className="analytics-grid" style={{ marginTop: 12 }}>
                <div className="analytics-card" style={{ borderLeft: "3px solid #ef4444" }}>
                  <h3>Gastos fijos {metricasAnio}</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.fijos)}</div>
                  <p>{metricas.totalAnual.pctFijosSobreBruto.toFixed(1)}% del bruto · {metricas.totalAnual.pctFijosSobreNeto.toFixed(1)}% del beneficio operativo</p>
                </div>
                <div className="analytics-card" style={{ borderLeft: "3px solid #f59e0b" }}>
                  <h3>Impuestos {metricasAnio}</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.impuestos)}</div>
                  <p>{metricas.totalAnual.pctImpuestosSobreBruto.toFixed(1)}% del bruto · {metricas.totalAnual.pctImpuestosSobreNeto.toFixed(1)}% del beneficio operativo</p>
                </div>
                {metricas.totalAnual.anuales > 0 && (
                  <div className="analytics-card" style={{ borderLeft: "3px solid #7c3aed" }}>
                    <h3>Anuales {metricasAnio}</h3>
                    <div className="analytics-stat-value">{fmt(metricas.totalAnual.anuales)}</div>
                    <p>{metricas.totalAnual.pctAnualesSobreBruto.toFixed(1)}% del bruto · {metricas.totalAnual.pctAnualesSobreNeto.toFixed(1)}% del beneficio operativo</p>
                  </div>
                )}
                <div className="analytics-card" style={{ borderLeft: "3px solid #059669" }}>
                  <h3>Beneficio tras fijos + impuestos + anuales</h3>
                  <div className="analytics-stat-value">{fmt(metricas.totalAnual.netoTrasFijos)}</div>
                  <p>Neto operativo {fmt(metricas.totalAnual.neto)} − fijos {fmt(metricas.totalAnual.fijos)} − impuestos {fmt(metricas.totalAnual.impuestos)} − anuales {fmt(metricas.totalAnual.anuales)}</p>
                </div>
              </div>

              {/* Gráfico de evolución mensual */}
              <div className="articulos-list-section" style={{ marginTop: 24, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Evolución mensual (bruto)</h3>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Gestión alquileres</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#8b5cf6", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Comisión alquileres</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Compraventas</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Créditos</span>
                  </div>
                </div>
                <GraficoEvolucion meses={metricas.meses} />
              </div>

              {/* Gráfico comparación interanual (líneas) */}
              {metricas.anioAnterior && (
                <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                    <h3 style={{ margin: 0 }}>Bruto: {metricasAnio} vs {metricasAnio - 1}</h3>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />{metricasAnio}</span>
                      <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#94a3b8", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />{metricasAnio - 1}</span>
                    </div>
                  </div>
                  {(() => {
                    const W = 720, H = 200, PAD_L = 50, PAD_B = 28, PAD_T = 12, PAD_R = 12;
                    const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
                    const allVals = [...metricas.meses.map((m) => m.bruto), ...metricas.mesesAnterior.map((m) => m.bruto)];
                    const max = Math.max(1, ...allVals);
                    const px = (i: number) => PAD_L + (i / 11) * chartW;
                    const py = (v: number) => PAD_T + chartH * (1 - v / max);
                    const line = (datos: MetricasMes[]) => datos.map((m, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(m.bruto).toFixed(1)}`).join(" ");
                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
                        {[0.25, 0.5, 0.75, 1].map((f) => (
                          <g key={f}>
                            <line x1={PAD_L} y1={py(max * f)} x2={W - PAD_R} y2={py(max * f)} stroke="#eee" strokeWidth={1} />
                            <text x={PAD_L - 6} y={py(max * f) + 3} fontSize={9} textAnchor="end" fill="#999">{EUR.format(max * f).replace(/,\d{2}\s?€$/, "€")}</text>
                          </g>
                        ))}
                        {NOMBRES_MES_CORTO.map((n, i) => (
                          <text key={n} x={px(i)} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">{n}</text>
                        ))}
                        <path d={line(metricas.mesesAnterior)} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6,4" />
                        <path d={line(metricas.meses)} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
                        {metricas.meses.map((m, i) => m.bruto > 0 && (
                          <circle key={i} cx={px(i)} cy={py(m.bruto)} r={3} fill="#3b82f6" />
                        ))}
                      </svg>
                    );
                  })()}
                </div>
              )}

              {/* Gráfico neto vs gastos */}
              <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Neto vs Gastos por mes</h3>
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Neto</span>
                    <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#ef4444", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Gastos</span>
                  </div>
                </div>
                {(() => {
                  const W = 720, H = 220, PAD_L = 50, PAD_B = 28, PAD_T = 24, PAD_R = 12;
                  const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
                  const max = Math.max(1, ...metricas.meses.map((m) => Math.max(Math.abs(m.neto), m.gastos + m.gastosFijos)));
                  const barW = chartW / 12, barPad = 6;
                  return (
                    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
                      {[0.25, 0.5, 0.75, 1].map((f) => {
                        const y = PAD_T + chartH * (1 - f);
                        return <line key={f} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#eee" strokeWidth={1} />;
                      })}
                      {metricas.meses.map((m, i) => {
                        const x = PAD_L + i * barW + barPad / 2;
                        const w = (barW - barPad) / 2;
                        const hN = (Math.max(0, m.neto) / max) * chartH;
                        const hG = ((m.gastos + m.gastosFijos) / max) * chartH;
                        const neto = Math.round(Math.max(0, m.neto));
                        const gasto = Math.round(m.gastos + m.gastosFijos);
                        return (
                          <g key={m.mes}>
                            <rect x={x} y={PAD_T + chartH - hN} width={w} height={hN} fill="#10b981" rx={2} />
                            {neto > 0 && <text x={x + w / 2} y={PAD_T + chartH - hN - 4} fontSize={8} textAnchor="middle" fill="#10b981" fontWeight={600}>{neto.toLocaleString("es-ES")}</text>}
                            <rect x={x + w} y={PAD_T + chartH - hG} width={w} height={hG} fill="#ef4444" rx={2} />
                            {gasto > 0 && <text x={x + w + w / 2} y={PAD_T + chartH - hG - 4} fontSize={8} textAnchor="middle" fill="#ef4444" fontWeight={600}>{gasto.toLocaleString("es-ES")}</text>}
                            <text x={x + (barW - barPad) / 2} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">{NOMBRES_MES_CORTO[i]}</text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Donuts: mix ingresos + mix gastos */}
              <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Mix de ingresos</h3>
                  <Donut titulo="Bruto" data={[
                    { label: "Gestión alquileres", value: metricas.totalAnual.alquileres, color: "#3b82f6" },
                    { label: "Comisión alquileres", value: metricas.totalAnual.alquilerComisiones, color: "#8b5cf6" },
                    { label: "Compraventas", value: metricas.totalAnual.compraventas, color: "#10b981" },
                    { label: "Créditos", value: metricas.totalAnual.creditos, color: "#f59e0b" },
                  ]} />
                </div>
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Mix de gastos</h3>
                  <Donut titulo="Gastos" data={[
                    { label: "Operacionales", value: metricas.totalAnual.gastos, color: "#ef4444" },
                    { label: "Fijos", value: metricas.totalAnual.fijos, color: "#f97316" },
                    { label: "Impuestos", value: metricas.totalAnual.impuestos, color: "#f59e0b" },
                    { label: "Anuales", value: metricas.totalAnual.anuales, color: "#7c3aed" },
                  ]} />
                </div>
              </div>

              {/* Waterfall anual */}
              <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <h3 style={{ margin: "0 0 12px" }}>Cascada anual: del bruto al neto final</h3>
                <Waterfall items={[
                  { label: "Bruto", value: metricas.totalAnual.bruto, tipo: "inicial" },
                  { label: "Gastos op.", value: metricas.totalAnual.gastos, tipo: "negativo" },
                  { label: "Fijos", value: metricas.totalAnual.fijos, tipo: "negativo" },
                  { label: "Impuestos", value: metricas.totalAnual.impuestos, tipo: "negativo" },
                  { label: "Anuales", value: metricas.totalAnual.anuales, tipo: "negativo" },
                  { label: "Neto final", value: metricas.totalAnual.netoTrasFijos - metricas.totalAnual.impuestos - metricas.totalAnual.anuales, tipo: "final" },
                ]} />
              </div>

              {/* YTD acumulado */}
              <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Acumulado YTD: bruto {metricasAnio} vs {metricasAnio - 1}</h3>
                </div>
                <LineaAcumulada meses={metricas.meses} mesesAnterior={metricas.mesesAnterior} anio={metricasAnio} campo="bruto" color="#3b82f6" />
                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ margin: 0 }}>Acumulado YTD: neto {metricasAnio} vs {metricasAnio - 1}</h3>
                </div>
                <LineaAcumulada meses={metricas.meses} mesesAnterior={metricas.mesesAnterior} anio={metricasAnio} campo="neto" color="#059669" />
              </div>

              {/* Margen % mensual */}
              <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <h3 style={{ margin: "0 0 12px" }}>Margen % mensual (neto tras fijos / bruto)</h3>
                <MargenMensual meses={metricas.meses} />
              </div>

              {/* Heatmap mes × línea */}
              <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                <h3 style={{ margin: "0 0 12px" }}>Estacionalidad: mes × línea de negocio</h3>
                <Heatmap meses={metricas.meses} />
              </div>

              {/* Barras horizontales: gasto fijo por concepto */}
              {gastosFijos.filter((g) => !g.fecha_fin || new Date(g.fecha_fin).getFullYear() >= metricasAnio).length > 0 && (
                <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                  <h3 style={{ margin: "0 0 12px" }}>Gastos fijos por concepto (anualizado)</h3>
                  <BarrasHorizontales
                    color="#f97316"
                    data={gastosFijos
                      .filter((g) => !g.fecha_fin || new Date(g.fecha_fin).getFullYear() >= metricasAnio)
                      .map((g) => ({
                        label: g.concepto,
                        value: g.tipo === "impuesto" ? g.importe_mensual * 4 : g.tipo === "anual" ? g.importe_mensual * 12 : g.importe_mensual * 12,
                      }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 12)}
                  />
                </div>
              )}

              {/* Barras horizontales: pagado_por */}
              {(() => {
                const porPersona: Record<string, number> = {};
                gastosFijos.forEach((g) => {
                  if (!g.pagado_por) return;
                  const anualizado = g.tipo === "impuesto" ? g.importe_mensual * 4 : g.importe_mensual * 12;
                  porPersona[g.pagado_por] = (porPersona[g.pagado_por] ?? 0) + anualizado;
                });
                gastosEmpresa.forEach((g) => {
                  if (!g.pagado_por) return;
                  if (new Date(g.fecha).getFullYear() !== metricasAnio) return;
                  porPersona[g.pagado_por] = (porPersona[g.pagado_por] ?? 0) + Number(g.importe);
                });
                const data = Object.entries(porPersona).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
                if (data.length === 0) return null;
                return (
                  <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                    <h3 style={{ margin: "0 0 12px" }}>Gasto adelantado por persona ({metricasAnio})</h3>
                    <BarrasHorizontales color="#8b5cf6" data={data} />
                  </div>
                );
              })()}

              {/* Pendiente vs cobrado por línea */}
              {balance && (
                <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                  <h3 style={{ margin: "0 0 12px" }}>Pendiente de cobro vs cobrado (balance global)</h3>
                  {(() => {
                    const filas = [
                      { label: "Gestión alquileres", cobrado: balance.alquileres.cobrado, pendiente: balance.alquileres.pendiente, color: "#3b82f6" },
                      ...(balance.alquilerComisiones ? [{ label: "Comisión alquileres", cobrado: balance.alquilerComisiones.cobrado, pendiente: balance.alquilerComisiones.pendiente, color: "#8b5cf6" }] : []),
                      { label: "Compraventas", cobrado: balance.compraventas.cobrado, pendiente: balance.compraventas.pendiente, color: "#10b981" },
                      { label: "Créditos", cobrado: balance.creditos.cobrado, pendiente: balance.creditos.pendiente, color: "#f59e0b" },
                    ];
                    const max = Math.max(1, ...filas.map((f) => f.cobrado + f.pendiente));
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {filas.map((f) => {
                          const total = f.cobrado + f.pendiente;
                          const pctCobrado = total > 0 ? (f.cobrado / max) * 100 : 0;
                          const pctPendiente = total > 0 ? (f.pendiente / max) * 100 : 0;
                          return (
                            <div key={f.label} style={{ display: "grid", gridTemplateColumns: "150px 1fr 160px", gap: 10, alignItems: "center", fontSize: 12 }}>
                              <span style={{ color: "#333" }}>{f.label}</span>
                              <div style={{ background: "#f1f5f9", borderRadius: 4, height: 20, display: "flex", overflow: "hidden" }}>
                                <div style={{ background: f.color, width: `${pctCobrado}%`, transition: "width 0.3s" }} title={`Cobrado ${fmt(f.cobrado)}`} />
                                <div style={{ background: "#fdba74", width: `${pctPendiente}%`, transition: "width 0.3s" }} title={`Pendiente ${fmt(f.pendiente)}`} />
                              </div>
                              <span style={{ textAlign: "right", color: "#666", fontSize: 11 }}>
                                <span style={{ color: f.color, fontWeight: 600 }}>{fmtCorto(f.cobrado)}</span>
                                {" / "}
                                <span style={{ color: f.pendiente > 0 ? "#c2410c" : "#999", fontWeight: 600 }}>{fmtCorto(f.pendiente)}</span>
                              </span>
                            </div>
                          );
                        })}
                        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#666", marginTop: 4 }}>
                          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Cobrado</span>
                          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#fdba74", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Pendiente</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Nº de operaciones cerradas por mes */}
              {(() => {
                const conteo = Array.from({ length: 12 }, () => ({ compraventas: 0, creditos: 0, alquileres: 0 }));
                operaciones.forEach((o) => {
                  const d = new Date(o.fecha_cierre);
                  if (d.getFullYear() === metricasAnio) conteo[d.getMonth()].compraventas++;
                });
                creditos.forEach((c) => {
                  const d = new Date(c.fecha);
                  if (d.getFullYear() === metricasAnio) conteo[d.getMonth()].creditos++;
                });
                alquilerComisiones.forEach((a) => {
                  const d = new Date(a.fecha);
                  if (d.getFullYear() === metricasAnio) conteo[d.getMonth()].alquileres++;
                });
                const totalOps = conteo.reduce((s, c) => s + c.compraventas + c.creditos + c.alquileres, 0);
                if (totalOps === 0) return null;
                const max = Math.max(1, ...conteo.map((c) => c.compraventas + c.creditos + c.alquileres));
                const W = 720, H = 180, PAD_L = 40, PAD_B = 28, PAD_T = 20, PAD_R = 12;
                const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
                const barW = chartW / 12, barPad = 6;
                return (
                  <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                      <h3 style={{ margin: 0 }}>Nº de operaciones cerradas por mes ({totalOps} en {metricasAnio})</h3>
                      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Compraventas</span>
                        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Créditos</span>
                        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#8b5cf6", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Alquileres com.</span>
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
                      {[0.25, 0.5, 0.75, 1].map((f) => (
                        <line key={f} x1={PAD_L} y1={PAD_T + chartH * (1 - f)} x2={W - PAD_R} y2={PAD_T + chartH * (1 - f)} stroke="#eee" />
                      ))}
                      {conteo.map((c, i) => {
                        const x = PAD_L + i * barW + barPad / 2;
                        const w = barW - barPad;
                        const hC = (c.compraventas / max) * chartH;
                        const hK = (c.creditos / max) * chartH;
                        const hA = (c.alquileres / max) * chartH;
                        const yC = PAD_T + chartH - hC;
                        const yK = yC - hK;
                        const yA = yK - hA;
                        const total = c.compraventas + c.creditos + c.alquileres;
                        return (
                          <g key={i}>
                            {hC > 0 && <rect x={x} y={yC} width={w} height={hC} fill="#10b981" rx={2} />}
                            {hK > 0 && <rect x={x} y={yK} width={w} height={hK} fill="#f59e0b" rx={2} />}
                            {hA > 0 && <rect x={x} y={yA} width={w} height={hA} fill="#8b5cf6" rx={2} />}
                            {total > 0 && <text x={x + w / 2} y={yA - 4} fontSize={10} textAnchor="middle" fill="#333" fontWeight={600}>{total}</text>}
                            <text x={x + w / 2} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">{NOMBRES_MES_CORTO[i]}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {/* Ticket medio por trimestre */}
              {(() => {
                const porTrimestre = [0, 1, 2, 3].map((q) => {
                  const inicio = q * 3, fin = q * 3 + 3;
                  const opsQ = operaciones.filter((o) => { const d = new Date(o.fecha_cierre); return d.getFullYear() === metricasAnio && d.getMonth() >= inicio && d.getMonth() < fin; });
                  const credQ = creditos.filter((c) => { const d = new Date(c.fecha); return d.getFullYear() === metricasAnio && d.getMonth() >= inicio && d.getMonth() < fin; });
                  const alqQ = alquilerComisiones.filter((a) => { const d = new Date(a.fecha); return d.getFullYear() === metricasAnio && d.getMonth() >= inicio && d.getMonth() < fin; });
                  return {
                    trimestre: q + 1,
                    compraventas: opsQ.length > 0 ? opsQ.reduce((s, o) => s + Number(o.comision_calculada), 0) / opsQ.length : 0,
                    creditos: credQ.length > 0 ? credQ.reduce((s, c) => s + Number(c.precio), 0) / credQ.length : 0,
                    alquileres: alqQ.length > 0 ? alqQ.reduce((s, a) => s + Number(a.comision_calculada), 0) / alqQ.length : 0,
                  };
                });
                const totalPresente = porTrimestre.some((t) => t.compraventas + t.creditos + t.alquileres > 0);
                if (!totalPresente) return null;
                const max = Math.max(1, ...porTrimestre.flatMap((t) => [t.compraventas, t.creditos, t.alquileres]));
                const W = 720, H = 200, PAD_L = 50, PAD_B = 28, PAD_T = 20, PAD_R = 12;
                const chartW = W - PAD_L - PAD_R, chartH = H - PAD_T - PAD_B;
                const groupW = chartW / 4, barW = (groupW - 20) / 3;
                return (
                  <div className="articulos-list-section" style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
                      <h3 style={{ margin: 0 }}>Ticket medio por trimestre</h3>
                      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#10b981", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Compraventas</span>
                        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f59e0b", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Créditos</span>
                        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#8b5cf6", borderRadius: 2, marginRight: 6, verticalAlign: "middle" }} />Alquileres com.</span>
                      </div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: "100%", height: "auto", display: "block" }}>
                      {[0.25, 0.5, 0.75, 1].map((f) => (
                        <g key={f}>
                          <line x1={PAD_L} y1={PAD_T + chartH * (1 - f)} x2={W - PAD_R} y2={PAD_T + chartH * (1 - f)} stroke="#eee" />
                          <text x={PAD_L - 6} y={PAD_T + chartH * (1 - f) + 3} fontSize={9} textAnchor="end" fill="#999">{fmtCorto(max * f)}</text>
                        </g>
                      ))}
                      {porTrimestre.map((t, i) => {
                        const xBase = PAD_L + i * groupW + 10;
                        const bars = [
                          { v: t.compraventas, color: "#10b981" },
                          { v: t.creditos, color: "#f59e0b" },
                          { v: t.alquileres, color: "#8b5cf6" },
                        ];
                        return (
                          <g key={i}>
                            {bars.map((b, j) => {
                              const h = (b.v / max) * chartH;
                              const x = xBase + j * barW;
                              const y = PAD_T + chartH - h;
                              return (
                                <g key={j}>
                                  {h > 0 && <rect x={x} y={y} width={barW - 2} height={h} fill={b.color} rx={2} />}
                                  {b.v > 0 && <text x={x + barW / 2} y={y - 3} fontSize={8} textAnchor="middle" fill={b.color} fontWeight={600}>{fmtCorto(b.v)}</text>}
                                </g>
                              );
                            })}
                            <text x={xBase + (groupW - 20) / 2} y={H - PAD_B + 14} fontSize={10} textAnchor="middle" fill="#666">T{t.trimestre}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {/* Trimestres */}
              <h3 style={{ marginTop: 24 }}>Por trimestre</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Trimestre</th>
                      <th>Bruto</th>
                      <th>Gastos</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.trimestres.map((t) => (
                      <tr key={t.trimestre}>
                        <td>T{t.trimestre}</td>
                        <td>{fmt(t.bruto)}</td>
                        <td>{fmt(t.gastos)}</td>
                        <td>{fmt(t.neto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mensual con comparativa */}
              <h3 style={{ marginTop: 24 }}>Por mes (con comparativa vs {metricasAnio - 1})</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Gestión</th>
                      <th>Comisión</th>
                      <th>Compraventas</th>
                      <th>Créditos</th>
                      <th>Bruto</th>
                      <th>Bruto {metricasAnio - 1}</th>
                      <th>Δ</th>
                      <th>Gastos</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.meses.map((m) => {
                      const prev = metricas.mesesAnterior[m.mes - 1];
                      const delta = variacionPct(m.bruto, prev?.bruto ?? 0);
                      return (
                        <tr key={m.mes}>
                          <td>{NOMBRES_MES[m.mes - 1]}</td>
                          <td>{fmt(m.alquileres)}</td>
                          <td>{fmt(m.alquilerComisiones ?? 0)}</td>
                          <td>{fmt(m.compraventas)}</td>
                          <td>{fmt(m.creditos)}</td>
                          <td><strong>{fmt(m.bruto)}</strong></td>
                          <td style={{ color: "#999" }}>{fmt(prev?.bruto ?? 0)}</td>
                          <td style={{ color: delta === null ? "#999" : delta >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{fmtPct(delta)}</td>
                          <td style={{ color: "#ef4444" }}>{fmt(m.gastos + m.gastosFijos)}</td>
                          <td>{fmt(m.neto - m.gastosFijos)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "creditos" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Operaciones de créditos ({creditos.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevaOperacionCredito((v) => !v)}>
              {mostrarNuevaOperacionCredito ? "Cancelar" : "Nueva operación"}
            </button>
          </div>

          {mostrarNuevaOperacionCredito && (
            <form className="piso-form" onSubmit={crearOperacionCredito}>
              <label>
                Cliente
                <select required value={nuevaOperacionCredito.cliente_id} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos} ({c.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Fecha
                  <input type="date" required value={nuevaOperacionCredito.fecha} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, fecha: e.target.value })} />
                </label>
                <label>
                  Precio (€)
                  <input type="number" min={0} required value={nuevaOperacionCredito.precio} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, precio: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar operación</button>
              </div>
            </form>
          )}

          {creditos.length === 0 ? (
            <p className="admin-empty">Todavía no hay operaciones de compra de créditos.</p>
          ) : (
            creditos.map((cr) => (
              <div key={cr.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleCredito(cr)} style={{ cursor: "pointer" }}>
                  <h4>{clienteNombre(cr.cliente_id)} {cr.cobrado ? <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Cobrado</span> : <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Pendiente</span>}</h4>
                  <div className="loc">
                    Fecha {new Date(cr.fecha).toLocaleDateString("es-ES")} · Bruto (precio) {fmt(cr.precio)}
                  </div>
                  <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 4, fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={!!cr.cobrado} onChange={async (e) => { await fetch(`/api/admin/creditos/${cr.id}/cobrado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cobrado: e.target.checked }) }); cargarTodo(); }} />
                    Cobrado
                  </label>
                  {creditoAbierto === cr.id && (
                    <div className="loc">Neto {fmt(netoDeOperacion(cr.precio, creditoGastos[cr.id] ?? []))}</div>
                  )}
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="btn-ghost" onClick={() => eliminarOperacionCredito(cr.id)}>
                    Eliminar operación
                  </button>
                </div>

                {creditoAbierto === cr.id && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirGastoCredito(cr.id, e)}>
                      <label>
                        Concepto
                        <input required value={nuevoGastoCredito.concepto} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, concepto: e.target.value })} placeholder="Coste de gestión, comisión pasarela..." />
                      </label>
                      <label>
                        Importe (€)
                        <input type="number" min={0} required value={nuevoGastoCredito.importe} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, importe: e.target.value })} />
                      </label>
                      <label>
                        Categoría
                        <select value={nuevoGastoCredito.categoria} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, categoria: e.target.value })}>
                          {CATEGORIAS_GASTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </label>
                      <button type="submit" className="btn-primary">Añadir gasto</button>
                    </form>
                    {(creditoGastos[cr.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {g.es_negativo ? "-" : "+"}{fmt(g.importe)} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span></span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoCreditoPagado(cr.id, g.id, e.target.checked)} />
                            Liquidado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGastoCredito(cr.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(creditoGastos[cr.id] ?? []).length === 0 && <p className="admin-empty">Sin movimientos registrados todavía.</p>}

                    <div className="lead-form-row" style={{ marginTop: 16 }}>
                      <label style={{ flex: 1 }}>
                        Adjuntar documento (PDF)
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          disabled={subiendoDocumentoCredito}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await subirDocumentoCredito(cr.id, file);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>
                    {(creditoDocumentos[cr.id] ?? []).map((doc) => (
                      <div key={doc.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <a href={`/api/admin/credito-documentos/${doc.id}`} target="_blank" rel="noreferrer">
                          {doc.nombre}
                        </a>
                        <button type="button" className="btn-ghost" onClick={() => eliminarDocumentoCredito(cr.id, doc.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(creditoDocumentos[cr.id] ?? []).length === 0 && <p className="admin-empty">Sin documentos adjuntos.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "alquileres" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" className={`contabilidad-tab${subTabAlquileres === "gestion" ? " active" : ""}`} onClick={() => setSubTabAlquileres("gestion")}>
              Alquileres en Gestión ({clientesConAlquiler.length})
            </button>
            <button type="button" className={`contabilidad-tab${subTabAlquileres === "comision" ? " active" : ""}`} onClick={() => setSubTabAlquileres("comision")}>
              Alquileres Comisión ({alquilerComisiones.length})
            </button>
          </div>

          {subTabAlquileres === "gestion" && (<>
          <div className="section-head">
            <h2>Alquileres en Gestión ({clientesConAlquiler.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarActivarAlquiler((v) => !v)}>
              {mostrarActivarAlquiler ? "Cancelar" : "Activar alquiler"}
            </button>
          </div>

          {mostrarActivarAlquiler && (
            <form className="piso-form" onSubmit={activarCliente}>
              <label>
                Cliente propietario
                <select required value={activarAlquiler.cliente_id} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {propietariosInactivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Mensualidad (€)
                  <input type="number" min={0} required value={activarAlquiler.mensualidad} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, mensualidad: e.target.value })} />
                </label>
                <label>
                  % Comisión
                  <input type="number" min={0} step="0.1" value={activarAlquiler.comision_pct} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, comision_pct: e.target.value })} />
                </label>
                <label>
                  Comisión € fija (opcional, sobrescribe %)
                  <input type="number" min={0} step="0.01" value={activarAlquiler.comision_fija} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, comision_fija: e.target.value })} placeholder="auto según %" />
                </label>
              </div>
              <div className="lead-form-row">
                <label>
                  Fecha inicio mensualidad
                  <input type="date" value={activarAlquiler.fecha_inicio} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, fecha_inicio: e.target.value })} />
                </label>
                <label>
                  Fecha fin (opcional)
                  <input type="date" value={activarAlquiler.fecha_fin} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, fecha_fin: e.target.value })} />
                </label>
              </div>
              {propietariosInactivos.length === 0 && (
                <p className="admin-empty">Todos los propietarios ya tienen un alquiler activo. Crea el cliente primero en la pestaña Clientes.</p>
              )}
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Activar</button>
              </div>
            </form>
          )}

          {clientesConAlquiler.length === 0 ? (
            <p className="admin-empty">Todavía no hay alquileres activos. Actívalos desde aquí para un propietario ya creado en Clientes.</p>
          ) : (
            clientesConAlquiler.map((cliente) => {
              const lista = ingresos[cliente.id] ?? [];
              const año = new Date().getUTCFullYear();
              const totalAño = lista.filter((i) => añoActual(i.mes) === año).reduce((s, i) => s + i.comision_calculada, 0);
              const pendientes = lista.filter((i) => !i.cobrado).length;
              return (
                <div key={cliente.id} className="pisos-list-item">
                  <div className="pisos-list-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ marginBottom: 4 }}>{cliente.nombre} {cliente.apellidos}</h4>
                      <div className="loc">
                        {cliente.telefono || "sin teléfono"} · {cliente.zona_interes || "sin zona"} · mensualidad {fmt(cliente.mensualidad)}
                        {cliente.alquiler_fecha_inicio && ` · desde ${cliente.alquiler_fecha_inicio}`}
                        {cliente.alquiler_fecha_fin && ` hasta ${cliente.alquiler_fecha_fin}`}
                      </div>
                      {lista.length > 0 && (
                        <div className="loc" style={{ marginTop: 4, fontSize: 12 }}>
                          Comisión {año}: <b>{fmt(totalAño)}</b>
                          {pendientes > 0 && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>{pendientes} pendiente{pendientes === 1 ? "" : "s"}</span>}
                        </div>
                      )}
                    </div>
                    <Link href={`/admin/contabilidad/${cliente.id}`} className="btn-primary" style={{ whiteSpace: "nowrap", textDecoration: "none" }}>
                      Abrir →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
          </>)}

          {subTabAlquileres === "comision" && (<>
            <div className="section-head">
              <h2>Alquileres Comisión ({alquilerComisiones.length})</h2>
              <button type="button" className="btn-primary" onClick={() => setMostrarNuevaAlquilerComision((v) => !v)}>
                {mostrarNuevaAlquilerComision ? "Cancelar" : "Nueva comisión"}
              </button>
            </div>

            {mostrarNuevaAlquilerComision && (
              <form className="piso-form" onSubmit={crearAlquilerComisionFn}>
                <label>
                  Cliente
                  <select required value={nuevaAlquilerComision.cliente_id} onChange={(e) => setNuevaAlquilerComision({ ...nuevaAlquilerComision, cliente_id: e.target.value })}>
                    <option value="">Selecciona...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellidos} ({c.tipo})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="lead-form-row">
                  <label>
                    Fecha
                    <input type="date" required value={nuevaAlquilerComision.fecha} onChange={(e) => setNuevaAlquilerComision({ ...nuevaAlquilerComision, fecha: e.target.value })} />
                  </label>
                  <label>
                    Precio alquiler mensual (€)
                    <input type="number" min={0} required value={nuevaAlquilerComision.precio_alquiler} onChange={(e) => setNuevaAlquilerComision({ ...nuevaAlquilerComision, precio_alquiler: e.target.value })} />
                  </label>
                  <label>
                    % Comisión
                    <input type="number" min={0} step="0.1" value={nuevaAlquilerComision.comision_pct} onChange={(e) => setNuevaAlquilerComision({ ...nuevaAlquilerComision, comision_pct: e.target.value })} />
                  </label>
                </div>
                <div className="lead-form-actions">
                  <button type="submit" className="btn-primary">Guardar comisión</button>
                </div>
              </form>
            )}

            {alquilerComisiones.length === 0 ? (
              <p className="admin-empty">Todavía no hay operaciones de comisión por alquiler.</p>
            ) : (
              alquilerComisiones.map((ac) => (
                <div key={ac.id} className="pisos-list-item">
                  {editandoAC === ac.id ? (
                    <form className="piso-form" onSubmit={guardarEdicionAC} style={{ padding: 12 }}>
                      <label>Cliente
                        <select required value={editACForm.cliente_id} onChange={(e) => setEditACForm({ ...editACForm, cliente_id: e.target.value })}>
                          <option value="">Seleccionar…</option>
                          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos ?? ""}</option>)}
                        </select>
                      </label>
                      <label>Fecha <input type="date" required value={editACForm.fecha} onChange={(e) => setEditACForm({ ...editACForm, fecha: e.target.value })} /></label>
                      <label>Precio alquiler (€/mes) <input type="number" min={0} required value={editACForm.precio_alquiler} onChange={(e) => setEditACForm({ ...editACForm, precio_alquiler: e.target.value })} /></label>
                      <label>Comisión (%) <input type="number" min={0} step="0.1" value={editACForm.comision_pct} onChange={(e) => setEditACForm({ ...editACForm, comision_pct: e.target.value })} /></label>
                      <label>Notas <input type="text" value={editACForm.notas} onChange={(e) => setEditACForm({ ...editACForm, notas: e.target.value })} /></label>
                      <div className="lead-form-actions">
                        <button type="submit" className="btn-primary">Guardar</button>
                        <button type="button" className="btn-ghost" onClick={() => setEditandoAC(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="pisos-list-body">
                        <h4>
                          {clienteNombre(ac.cliente_id)}
                          {ac.cobrado
                            ? <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Cobrado</span>
                            : <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Pendiente</span>}
                        </h4>
                        <div className="loc">
                          Fecha {new Date(ac.fecha).toLocaleDateString("es-ES")} · Alquiler {fmt(ac.precio_alquiler)}/mes · Comisión {ac.comision_pct}% · <b>{fmt(ac.comision_calculada)}</b>
                          {ac.notas && <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 12 }}>— {ac.notas}</span>}
                        </div>
                        <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 4, fontSize: 13 }}>
                          <input type="checkbox" checked={ac.cobrado} onChange={(e) => toggleAlquilerComisionCobrado(ac.id, e.target.checked)} />
                          Cobrado
                        </label>
                      </div>
                      <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                        <button type="button" className="btn-ghost" onClick={() => iniciarEdicionAC(ac)}>Editar</button>
                        <button type="button" className="btn-ghost" style={{ color: "#dc2626" }} onClick={() => eliminarAlquilerComisionFn(ac.id)}>
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </>)}
        </div>
      )}

      {tab === "gastos" && (() => {
        const hoy = new Date();
        const deudaPorPersona: Record<string, number> = {};
        const sumar = (persona: string | null, importe: number) => {
          if (!persona) return;
          if (!deudaPorPersona[persona]) deudaPorPersona[persona] = 0;
          deudaPorPersona[persona] += importe;
        };
        // Solo gastos fijos y anuales (NO impuestos) computan en la deuda
        for (const g of gastosFijos) {
          if (!g.pagado_por || g.tipo === "impuesto") continue;
          const inicio = new Date(g.fecha_inicio);
          const fin = g.fecha_fin ? new Date(g.fecha_fin) : hoy;
          const hasta = fin < hoy ? fin : hoy;
          if (hasta < inicio) continue;
          if (g.tipo === "anual") {
            const anios = (hasta.getUTCFullYear() - inicio.getUTCFullYear()) + 1;
            sumar(g.pagado_por, g.importe_mensual * Math.max(anios, 0));
          } else {
            const meses = (hasta.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - inicio.getUTCMonth()) + 1;
            sumar(g.pagado_por, g.importe_mensual * Math.max(meses, 0));
          }
        }
        for (const g of gastosEmpresa) {
          sumar(g.pagado_por, g.importe);
        }
        // Liquidaciones restan de la deuda
        const liquidadoPorPersona: Record<string, number> = {};
        for (const l of liquidaciones) {
          if (!liquidadoPorPersona[l.persona]) liquidadoPorPersona[l.persona] = 0;
          liquidadoPorPersona[l.persona] += Number(l.importe);
        }
        const todasPersonas = new Set([...Object.keys(deudaPorPersona), ...Object.keys(liquidadoPorPersona)]);
        const personas = Array.from(todasPersonas).map((nombre) => {
          const total = deudaPorPersona[nombre] || 0;
          const liquidado = liquidadoPorPersona[nombre] || 0;
          return { nombre, total, liquidado, pendiente: total - liquidado };
        }).filter((p) => p.total > 0 || p.liquidado > 0);

        const MESES_NOMBRE = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        type LineaDesglose = { key: string; concepto: string; periodo: string; importe: number; tipo: "fijo" | "puntual" | "pago" };
        function desglosePersona(nombre: string): LineaDesglose[] {
          const lineas: LineaDesglose[] = [];
          for (const g of gastosFijos) {
            if (g.pagado_por !== nombre || g.tipo === "impuesto") continue;
            const inicio = new Date(g.fecha_inicio);
            const fin = g.fecha_fin ? new Date(g.fecha_fin) : hoy;
            const hasta = fin < hoy ? fin : hoy;
            if (hasta < inicio) continue;
            if (g.tipo === "anual") {
              for (let y = inicio.getUTCFullYear(); y <= hasta.getUTCFullYear(); y++) {
                lineas.push({ key: `${g.id}-${y}`, concepto: g.concepto, periodo: String(y), importe: g.importe_mensual, tipo: "fijo" });
              }
            } else {
              const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
              const limiteMs = Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1);
              while (cursor.getTime() <= limiteMs) {
                const m = cursor.getUTCMonth();
                const y = cursor.getUTCFullYear();
                lineas.push({ key: `${g.id}-${y}-${m}`, concepto: g.concepto, periodo: `${MESES_NOMBRE[m]} ${String(y).slice(2)}`, importe: g.importe_mensual, tipo: "fijo" });
                cursor.setUTCMonth(cursor.getUTCMonth() + 1);
              }
            }
          }
          for (const g of gastosEmpresa) {
            if (g.pagado_por !== nombre) continue;
            lineas.push({ key: `emp-${g.id}`, concepto: g.concepto, periodo: new Date(g.fecha).toLocaleDateString("es-ES"), importe: g.importe, tipo: "puntual" });
          }
          for (const l of liquidaciones) {
            if (l.persona !== nombre) continue;
            lineas.push({ key: `liq-${l.id}`, concepto: l.concepto || "Pago", periodo: new Date(l.fecha).toLocaleDateString("es-ES"), importe: -Number(l.importe), tipo: "pago" });
          }
          return lineas;
        }

        return (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Gastos ({gastosFijos.filter((g) => !g.fecha_fin).length} fijos activos · {gastosEmpresa.length} puntuales)</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-primary" onClick={() => { setMostrarNuevoFijo((v) => !v); setMostrarNuevoGastoEmpresa(false); }}>
                {mostrarNuevoFijo ? "Cancelar" : "Nuevo gasto fijo"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setMostrarNuevoGastoEmpresa((v) => !v); setMostrarNuevoFijo(false); }}>
                {mostrarNuevoGastoEmpresa ? "Cancelar" : "Gasto puntual"}
              </button>
            </div>
          </div>

          {mostrarNuevoFijo && (
            <form className="piso-form" onSubmit={crearGastoFijo}>
              <div className="lead-form-row">
                <label>
                  Tipo
                  <select value={nuevoFijo.tipo} onChange={(e) => setNuevoFijo({ ...nuevoFijo, tipo: e.target.value as "fijo" | "impuesto" | "anual" })}>
                    <option value="fijo">Gasto fijo (mensual)</option>
                    <option value="impuesto">Impuesto trimestre</option>
                    <option value="anual">Suscripción anual</option>
                  </select>
                </label>
                <label>
                  Concepto
                  <input required value={nuevoFijo.concepto} onChange={(e) => setNuevoFijo({ ...nuevoFijo, concepto: e.target.value })} placeholder={nuevoFijo.tipo === "impuesto" ? "IVA Q1, IRPF Q2..." : nuevoFijo.tipo === "anual" ? "Dominio, certificado SSL..." : "Vercel Pro, Anthropic..."} />
                </label>
                <label>
                  {nuevoFijo.tipo === "impuesto" ? "Importe trimestral (€)" : nuevoFijo.tipo === "anual" ? "Importe anual (€)" : "Importe mensual (€)"}
                  <input type="number" min={0} step="0.01" required value={nuevoFijo.importe_mensual} onChange={(e) => setNuevoFijo({ ...nuevoFijo, importe_mensual: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-row">
                <label>
                  Categoría
                  <select value={nuevoFijo.categoria} onChange={(e) => setNuevoFijo({ ...nuevoFijo, categoria: e.target.value })}>
                    <option value="software">Software / SaaS</option>
                    <option value="hosting">Hosting / Infra</option>
                    <option value="marketing">Marketing / Ads</option>
                    <option value="salarios">Salarios / Freelance</option>
                    <option value="oficina">Oficina</option>
                    <option value="iva">IVA</option>
                    <option value="irpf">IRPF</option>
                    <option value="sociedades">Impuesto sociedades</option>
                    <option value="otros">Otros</option>
                  </select>
                </label>
                <label>
                  Pagado por
                  <input value={nuevoFijo.pagado_por} onChange={(e) => setNuevoFijo({ ...nuevoFijo, pagado_por: e.target.value })} placeholder="Nombre de quien paga" />
                </label>
                <label>
                  Desde
                  <input type="date" value={nuevoFijo.fecha_inicio} onChange={(e) => setNuevoFijo({ ...nuevoFijo, fecha_inicio: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          )}

          {mostrarNuevoGastoEmpresa && (
            <form className="piso-form" onSubmit={crearGastoEmpresaFn}>
              <div className="lead-form-row">
                <label>
                  Concepto
                  <input required value={nuevoGastoEmpresa.concepto} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, concepto: e.target.value })} placeholder="Material, desplazamiento..." />
                </label>
                <label>
                  Importe (€)
                  <input type="number" min={0} step="0.01" required value={nuevoGastoEmpresa.importe} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, importe: e.target.value })} />
                </label>
                <label>
                  Fecha
                  <input type="date" required value={nuevoGastoEmpresa.fecha} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, fecha: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-row">
                <label>
                  Categoría
                  <select value={nuevoGastoEmpresa.categoria} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, categoria: e.target.value })}>
                    <option value="material">Material</option>
                    <option value="desplazamiento">Desplazamiento</option>
                    <option value="comida">Comida / Dietas</option>
                    <option value="software">Software</option>
                    <option value="marketing">Marketing</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="legal">Legal / Asesoría</option>
                    <option value="otros">Otros</option>
                  </select>
                </label>
                <label>
                  Pagado por
                  <input value={nuevoGastoEmpresa.pagado_por} onChange={(e) => setNuevoGastoEmpresa({ ...nuevoGastoEmpresa, pagado_por: e.target.value })} placeholder="Nombre de quien paga" />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar gasto</button>
              </div>
            </form>
          )}

          {/* Resumen */}
          {(() => {
            const activos = gastosFijos.filter((g) => !g.fecha_fin);
            const fijosAct = activos.filter((g) => (g.tipo ?? "fijo") === "fijo");
            const impAct = activos.filter((g) => g.tipo === "impuesto");
            const anualAct = activos.filter((g) => g.tipo === "anual");
            const totalFijoMes = fijosAct.reduce((s, g) => s + Number(g.importe_mensual), 0);
            const totalImpTrim = impAct.reduce((s, g) => s + Number(g.importe_mensual), 0);
            const totalAnual = anualAct.reduce((s, g) => s + Number(g.importe_mensual), 0);
            const totalPuntuales = gastosEmpresa.reduce((s, g) => s + Number(g.importe), 0);
            return (
              <div className="pnl-card" style={{ marginBottom: 12 }}>
                <div><b>{fmt(totalFijoMes)}</b><span>Fijos /mes</span></div>
                <div><b>{fmt(totalImpTrim)}</b><span>Impuestos /trim</span></div>
                <div><b>{fmt(totalAnual)}</b><span>Anuales /año</span></div>
                <div><b>{fmt(totalFijoMes * 12 + totalImpTrim * 4 + totalAnual)}</b><span>Anualizado total</span></div>
                <div><b>{fmt(totalPuntuales)}</b><span>Puntuales total</span></div>
              </div>
            );
          })()}

          {/* Gastos fijos e impuestos en grid 2 columnas */}
          {(() => {
            const fijosList = gastosFijos.filter((g) => (g.tipo ?? "fijo") === "fijo");
            const impList = gastosFijos.filter((g) => g.tipo === "impuesto");
            const anualList = gastosFijos.filter((g) => g.tipo === "anual");
            const renderItem = (g: GastoFijo) => {
              const esImpuesto = g.tipo === "impuesto";
              const esAnual = g.tipo === "anual";
              if (editandoFijo === g.id) {
                return (
                  <div key={g.id} className="chat-widget-msg assistant" style={{ padding: 10 }}>
                    <div className="lead-form-row" style={{ marginBottom: 6 }}>
                      <label style={{ flex: 2 }}>
                        Concepto
                        <input value={edicionFijo.concepto} onChange={(e) => setEdicionFijo({ ...edicionFijo, concepto: e.target.value })} />
                      </label>
                      <label style={{ flex: 1 }}>
                        {edicionFijo.tipo === "impuesto" ? "€/trim" : edicionFijo.tipo === "anual" ? "€/año" : "€/mes"}
                        <input type="number" min={0} step="0.01" value={edicionFijo.importe_mensual} onChange={(e) => setEdicionFijo({ ...edicionFijo, importe_mensual: e.target.value })} />
                      </label>
                    </div>
                    <div className="lead-form-row" style={{ marginBottom: 6 }}>
                      <label style={{ flex: 1 }}>
                        Pagado por
                        <input value={edicionFijo.pagado_por} onChange={(e) => setEdicionFijo({ ...edicionFijo, pagado_por: e.target.value })} placeholder="Nombre" />
                      </label>
                      <label style={{ flex: 1 }}>
                        Categoría
                        <select value={edicionFijo.categoria} onChange={(e) => setEdicionFijo({ ...edicionFijo, categoria: e.target.value })}>
                          <option value="software">Software / SaaS</option>
                          <option value="hosting">Hosting / Infra</option>
                          <option value="marketing">Marketing / Ads</option>
                          <option value="salarios">Salarios / Freelance</option>
                          <option value="oficina">Oficina</option>
                          <option value="iva">IVA</option>
                          <option value="irpf">IRPF</option>
                          <option value="sociedades">Impuesto sociedades</option>
                          <option value="otros">Otros</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ padding: "8px 0", borderTop: "1px solid #e5e7eb", marginTop: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>
                        Documentos adjuntos
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                          disabled={subiendoDocGastoFijo}
                          style={{ fontSize: 12, marginTop: 4, display: "block" }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await subirDocumentoGastoFijo(g.id, file);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      {(gastoFijoDocumentos[g.id] ?? []).map((doc) => (
                        <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "3px 0" }}>
                          <a href={`/api/admin/gastos-fijos/${g.id}/documentos/${doc.id}`} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                            {doc.nombre}
                          </a>
                          <button type="button" className="btn-ghost" style={{ fontSize: 11 }} onClick={() => eliminarDocumentoGastoFijo(g.id, doc.id)}>Borrar</button>
                        </div>
                      ))}
                      {(gastoFijoDocumentos[g.id] ?? []).length === 0 && <p className="admin-empty" style={{ margin: "4px 0 0", fontSize: 12 }}>Sin documentos adjuntos.</p>}
                    </div>
                    <div className="lead-form-actions">
                      <button type="button" className="btn-primary" onClick={() => guardarEdicionFijo(g.id)}>Guardar</button>
                      <button type="button" className="btn-ghost" onClick={() => setEditandoFijo(null)}>Cancelar</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", opacity: g.fecha_fin ? 0.5 : 1 }}>
                  <span>
                    <b>{fmt(g.importe_mensual)}{esImpuesto ? "/trim" : esAnual ? "/año" : "/mes"}</b>
                    {esImpuesto && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>(≈{fmt(g.importe_mensual / 3)}/mes)</span>}
                    {esAnual && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>(≈{fmt(g.importe_mensual / 12)}/mes)</span>}
                    <br />
                    <span style={{ fontSize: 13 }}>{g.concepto} · <span style={{ opacity: 0.6 }}>{g.categoria}</span></span>
                    {g.pagado_por && <span style={{ fontSize: 12, marginLeft: 6, padding: "1px 6px", background: "#e0e7ff", color: "#3730a3", borderRadius: 4 }}>Paga: {g.pagado_por}</span>}
                    {(gastoFijoDocumentos[g.id]?.length ?? 0) > 0 && <span style={{ fontSize: 12, marginLeft: 6, padding: "1px 6px", background: "#dbeafe", color: "#1e40af", borderRadius: 4 }}>{gastoFijoDocumentos[g.id].length} doc{gastoFijoDocumentos[g.id].length > 1 ? "s" : ""}</span>}
                    <br />
                    <span style={{ opacity: 0.5, fontSize: 11 }}>desde {g.fecha_inicio}{g.fecha_fin && ` · hasta ${g.fecha_fin}`}</span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button type="button" className="btn-ghost" onClick={async () => { setEditandoFijo(g.id); setEdicionFijo({ concepto: g.concepto, importe_mensual: String(g.importe_mensual), categoria: g.categoria, tipo: g.tipo, pagado_por: g.pagado_por || "" }); if (!gastoFijoDocumentos[g.id]) { const data = await fetch(`/api/admin/gastos-fijos/${g.id}/documentos`).then((r) => r.json()); setGastoFijoDocumentos((prev) => ({ ...prev, [g.id]: Array.isArray(data) ? data : [] })); } }}>Editar</button>
                    {!g.fecha_fin && (
                      <button type="button" className="btn-ghost" onClick={() => terminarGastoFijo(g.id)}>Finalizar</button>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => eliminarGastoFijo(g.id)}>Borrar</button>
                  </span>
                </div>
              );
            };
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, color: "#1e40af" }}>Gastos fijos mensuales ({fijosList.length})</h3>
                  {fijosList.length === 0 ? <p className="admin-empty" style={{ margin: 0 }}>Sin gastos fijos.</p> : fijosList.map(renderItem)}
                </div>
                <div style={{ border: "1px solid #fde68a", borderRadius: 12, padding: 12, background: "#fffbeb" }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, color: "#b45309" }}>Impuestos trimestrales ({impList.length})</h3>
                  {impList.length === 0 ? <p className="admin-empty" style={{ margin: 0 }}>Sin impuestos.</p> : impList.map(renderItem)}
                </div>
                <div style={{ border: "1px solid #c4b5fd", borderRadius: 12, padding: 12, background: "#f5f3ff" }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, color: "#6d28d9" }}>Suscripciones anuales ({anualList.length})</h3>
                  {anualList.length === 0 ? <p className="admin-empty" style={{ margin: 0 }}>Sin suscripciones anuales.</p> : anualList.map(renderItem)}
                </div>
              </div>
            );
          })()}

          {/* Gastos puntuales */}
          <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fafafa" }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Gastos puntuales ({gastosEmpresa.length})</h3>
            {gastosEmpresa.length === 0 ? (
              <p className="admin-empty" style={{ margin: 0 }}>Sin gastos puntuales. Usa el botón "Gasto puntual" para añadir uno.</p>
            ) : (
              gastosEmpresa.map((g) => editandoEmpresa === g.id ? (
                <div key={g.id} className="chat-widget-msg assistant" style={{ padding: 10 }}>
                  <div className="lead-form-row" style={{ marginBottom: 6 }}>
                    <label style={{ flex: 2 }}>
                      Concepto
                      <input value={edicionEmpresa.concepto} onChange={(e) => setEdicionEmpresa({ ...edicionEmpresa, concepto: e.target.value })} />
                    </label>
                    <label style={{ flex: 1 }}>
                      Importe (€)
                      <input type="number" step="0.01" value={edicionEmpresa.importe} onChange={(e) => setEdicionEmpresa({ ...edicionEmpresa, importe: e.target.value })} />
                    </label>
                    <label style={{ flex: 1 }}>
                      Fecha
                      <input type="date" value={edicionEmpresa.fecha} onChange={(e) => setEdicionEmpresa({ ...edicionEmpresa, fecha: e.target.value })} />
                    </label>
                  </div>
                  <div className="lead-form-row" style={{ marginBottom: 6 }}>
                    <label style={{ flex: 1 }}>
                      Categoría
                      <select value={edicionEmpresa.categoria} onChange={(e) => setEdicionEmpresa({ ...edicionEmpresa, categoria: e.target.value })}>
                        <option value="material">Material</option>
                        <option value="desplazamiento">Desplazamiento</option>
                        <option value="comida">Comida / Dietas</option>
                        <option value="software">Software</option>
                        <option value="marketing">Marketing</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="legal">Legal / Asesoría</option>
                        <option value="otros">Otros</option>
                      </select>
                    </label>
                    <label style={{ flex: 1 }}>
                      Pagado por
                      <input value={edicionEmpresa.pagado_por} onChange={(e) => setEdicionEmpresa({ ...edicionEmpresa, pagado_por: e.target.value })} placeholder="Nombre" />
                    </label>
                  </div>
                  <div className="lead-form-actions">
                    <button type="button" className="btn-primary" onClick={() => guardarEdicionEmpresa(g.id)}>Aceptar</button>
                    <button type="button" className="btn-ghost" onClick={() => setEditandoEmpresa(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <span>
                    <b>{fmt(g.importe)}</b> · {g.concepto} · <span style={{ opacity: 0.6 }}>{g.categoria}</span>
                    <br />
                    <span style={{ opacity: 0.5, fontSize: 11 }}>{new Date(g.fecha).toLocaleDateString("es-ES")}</span>
                    {g.pagado_por && <span style={{ fontSize: 12, marginLeft: 6, padding: "1px 6px", background: "#e0e7ff", color: "#3730a3", borderRadius: 4 }}>Paga: {g.pagado_por}</span>}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button type="button" className="btn-ghost" onClick={() => { setEditandoEmpresa(g.id); setEdicionEmpresa({ concepto: g.concepto, importe: String(g.importe), fecha: g.fecha, categoria: g.categoria, pagado_por: g.pagado_por || "" }); }}>Editar</button>
                    <button type="button" className="btn-ghost" onClick={() => eliminarGastoEmpresaFn(g.id)}>Borrar</button>
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Resumen de deuda por persona + liquidaciones */}
          {(personas.length > 0 || liquidaciones.length > 0) && (
            <div style={{ marginTop: 24, border: "2px solid #c7d2fe", borderRadius: 12, padding: 16, background: "#eef2ff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: "#3730a3" }}>Deuda por persona</h3>
                <button type="button" className="btn-primary" onClick={() => setMostrarNuevaLiquidacion((v) => !v)}>
                  {mostrarNuevaLiquidacion ? "Cancelar" : "Registrar pago"}
                </button>
              </div>
              {mostrarNuevaLiquidacion && (
                <form className="piso-form" style={{ marginBottom: 12 }} onSubmit={crearLiquidacionFn}>
                  <div className="lead-form-row">
                    <label>
                      Persona
                      <input required value={nuevaLiquidacion.persona} onChange={(e) => setNuevaLiquidacion({ ...nuevaLiquidacion, persona: e.target.value })} placeholder="Nombre" list="personas-deuda" />
                      <datalist id="personas-deuda">
                        {personas.map((p) => <option key={p.nombre} value={p.nombre} />)}
                      </datalist>
                    </label>
                    <label>
                      Importe (€)
                      <input type="number" min={0} step="0.01" required value={nuevaLiquidacion.importe} onChange={(e) => setNuevaLiquidacion({ ...nuevaLiquidacion, importe: e.target.value })} />
                    </label>
                    <label>
                      Fecha
                      <input type="date" required value={nuevaLiquidacion.fecha} onChange={(e) => setNuevaLiquidacion({ ...nuevaLiquidacion, fecha: e.target.value })} />
                    </label>
                    <label>
                      Concepto
                      <input value={nuevaLiquidacion.concepto} onChange={(e) => setNuevaLiquidacion({ ...nuevaLiquidacion, concepto: e.target.value })} placeholder="Transferencia, efectivo..." />
                    </label>
                  </div>
                  <div className="lead-form-actions">
                    <button type="submit" className="btn-primary">Guardar pago</button>
                  </div>
                </form>
              )}
              {personas.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Persona</th>
                        <th>Total acumulado</th>
                        <th>Pagos realizados</th>
                        <th>Pendiente de devolver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personas.map((p) => (
                        <React.Fragment key={p.nombre}>
                          <tr style={{ cursor: "pointer" }} onClick={() => setPersonaExpandida(personaExpandida === p.nombre ? null : p.nombre)}>
                            <td><b>{personaExpandida === p.nombre ? "▼" : "▶"} {p.nombre}</b></td>
                            <td>{fmt(p.total)}</td>
                            <td>{fmt(p.liquidado)}</td>
                            <td style={{ fontWeight: 700, color: p.pendiente > 0 ? "#c2410c" : "#059669" }}>{fmt(p.pendiente)}</td>
                          </tr>
                          {personaExpandida === p.nombre && (() => {
                            const lineas = desglosePersona(p.nombre);
                            const lineasPendientes = lineas.filter((l) => l.tipo !== "pago");
                            const seleccionadasDePersona = lineasPendientes.filter((l) => lineasSeleccionadas.has(l.key));
                            const importeSeleccionado = seleccionadasDePersona.reduce((s, l) => s + l.importe, 0);
                            const todasSeleccionadas = lineasPendientes.length > 0 && seleccionadasDePersona.length === lineasPendientes.length;
                            return (
                              <tr>
                                <td colSpan={4} style={{ padding: 0, background: "#f5f3ff" }}>
                                  <div style={{ padding: "8px 16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: "#4338ca" }}>Desglose de {p.nombre}</span>
                                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        {seleccionadasDePersona.length > 0 && (
                                          <button type="button" className="btn-primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={async () => {
                                            if (!confirm(`¿Estás seguro de que quieres liquidar los ${seleccionadasDePersona.length} pagos seleccionados por ${fmt(importeSeleccionado)}?`)) return;
                                            await fetch("/api/admin/liquidaciones", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ persona: p.nombre, importe: importeSeleccionado, fecha: new Date().toISOString().slice(0, 10), concepto: `Liquidación de ${seleccionadasDePersona.length} pago${seleccionadasDePersona.length > 1 ? "s" : ""}` }),
                                            });
                                            setLineasSeleccionadas(new Set());
                                            cargarTodo();
                                          }}>
                                            Liquidar seleccionados ({fmt(importeSeleccionado)})
                                          </button>
                                        )}
                                        {p.pendiente > 0 && (
                                          <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={async () => {
                                            if (!confirm(`¿Estás seguro de que quieres liquidar todos los pagos pendientes de ${p.nombre} por ${fmt(p.pendiente)}?`)) return;
                                            await fetch("/api/admin/liquidaciones", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ persona: p.nombre, importe: p.pendiente, fecha: new Date().toISOString().slice(0, 10), concepto: "Liquidación total" }),
                                            });
                                            setLineasSeleccionadas(new Set());
                                            cargarTodo();
                                          }}>
                                            Liquidar todo ({fmt(p.pendiente)})
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                                      <tbody>
                                        {lineasPendientes.length > 0 && (
                                          <tr style={{ borderBottom: "1px solid #e0e7ff" }}>
                                            <td style={{ padding: "4px 0", width: 24 }}>
                                              <input type="checkbox" checked={todasSeleccionadas} onChange={() => {
                                                const next = new Set(lineasSeleccionadas);
                                                if (todasSeleccionadas) {
                                                  lineasPendientes.forEach((l) => next.delete(l.key));
                                                } else {
                                                  lineasPendientes.forEach((l) => next.add(l.key));
                                                }
                                                setLineasSeleccionadas(next);
                                              }} />
                                            </td>
                                            <td colSpan={3} style={{ padding: "4px 0", fontSize: 11, opacity: 0.6 }}>Seleccionar todo</td>
                                          </tr>
                                        )}
                                        {lineas.map((l) => (
                                          <tr key={l.key} style={{ borderBottom: "1px solid #e0e7ff", background: lineasSeleccionadas.has(l.key) ? "#e0e7ff" : undefined }}>
                                            <td style={{ padding: "4px 0", width: 24 }}>
                                              {l.tipo !== "pago" && (
                                                <input type="checkbox" checked={lineasSeleccionadas.has(l.key)} onChange={() => {
                                                  const next = new Set(lineasSeleccionadas);
                                                  if (next.has(l.key)) next.delete(l.key); else next.add(l.key);
                                                  setLineasSeleccionadas(next);
                                                }} />
                                              )}
                                            </td>
                                            <td style={{ padding: "4px 0", width: "35%" }}>
                                              {l.tipo === "pago" ? <span style={{ color: "#059669" }}>{l.concepto}</span> : l.concepto}
                                              {l.tipo === "puntual" && <span style={{ opacity: 0.5, marginLeft: 4, fontSize: 11 }}>(puntual)</span>}
                                            </td>
                                            <td style={{ padding: "4px 8px", opacity: 0.7, width: "25%" }}>{l.periodo}</td>
                                            <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600, color: l.tipo === "pago" ? "#059669" : undefined }}>
                                              {l.tipo === "pago" ? `- ${fmt(Math.abs(l.importe))}` : fmt(l.importe)}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr style={{ borderTop: "2px solid #c7d2fe" }}>
                                          <td />
                                          <td colSpan={2} style={{ padding: "6px 0", fontWeight: 700 }}>Pendiente</td>
                                          <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700, color: p.pendiente > 0 ? "#c2410c" : "#059669" }}>{fmt(p.pendiente)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {tab === "compraventas" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Operaciones ({operaciones.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevaOperacion((v) => !v)}>
              {mostrarNuevaOperacion ? "Cancelar" : "Nueva operación"}
            </button>
          </div>

          {mostrarNuevaOperacion && (
            <form className="piso-form" onSubmit={crearOperacion}>
              <label>
                Cliente
                <select required value={nuevaOperacion.cliente_id} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos} ({c.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Fecha de cierre
                  <input type="date" required value={nuevaOperacion.fecha_cierre} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, fecha_cierre: e.target.value })} />
                </label>
                <label>
                  Precio de venta (€)
                  <input type="number" min={0} required value={nuevaOperacion.precio_venta} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, precio_venta: e.target.value })} />
                </label>
                <label>
                  % Comisión
                  <input type="number" min={0} step="0.1" value={nuevaOperacion.comision_pct} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, comision_pct: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar operación</button>
              </div>
            </form>
          )}

          {operaciones.length === 0 ? (
            <p className="admin-empty">Todavía no hay operaciones de compraventa.</p>
          ) : (
            operaciones.map((op) => (
              <div key={op.id} className="pisos-list-item" style={{ position: "relative" }}>
                <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6, zIndex: 2 }}>
                  <button type="button" onClick={() => abrirEdicionOp(op)} title={editandoOp === op.id ? "Cerrar edición" : "Editar bruto"} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "var(--orange)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                  <button type="button" onClick={() => { if (confirm(`¿Seguro que quieres eliminar esta operación de ${clienteNombre(op.cliente_id)}? Esta acción no se puede deshacer.`)) eliminarOperacion(op.id); }} title="Eliminar operación" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "var(--orange)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                <div className="pisos-list-body" onClick={() => toggleOperacion(op)} style={{ cursor: "pointer", paddingLeft: 72 }}>
                  <h4>{clienteNombre(op.cliente_id)} {op.cobrado ? <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Cobrado</span> : <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>Pendiente</span>}</h4>
                  <div className="loc">
                    Cierre {new Date(op.fecha_cierre).toLocaleDateString("es-ES")} · Venta {fmt(op.precio_venta)} · Bruto (comisión) {fmt(op.comision_calculada)}
                  </div>
                  <label style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 4, fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={!!op.cobrado} onChange={async (e) => { await fetch(`/api/admin/operaciones/${op.id}/cobrado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cobrado: e.target.checked }) }); cargarTodo(); }} />
                    Cobrado
                  </label>
                  {operacionAbierta === op.id && (
                    <div className="loc">Ganancia neta {fmt(netoDeOperacion(op.comision_calculada, gastos[op.id] ?? []))}</div>
                  )}
                </div>

                {editandoOp === op.id && (
                  <div className="chat-transcript">
                    <p className="admin-empty" style={{ marginTop: 0 }}>Edita el bruto directamente, o recalcúlalo cambiando precio y %.</p>
                    <div className="lead-form-row">
                      <label>
                        Bruto (comisión) €
                        <input type="number" min={0} step="0.01" value={edicionOp.comision_calculada} onChange={(e) => setEdicionOp({ ...edicionOp, comision_calculada: e.target.value })} />
                      </label>
                      <button type="button" className="btn-primary" onClick={() => guardarEdicionOp(op.id, "manual")}>Guardar bruto</button>
                    </div>
                    <div className="lead-form-row">
                      <label>
                        Precio de venta €
                        <input type="number" min={0} value={edicionOp.precio_venta} onChange={(e) => setEdicionOp({ ...edicionOp, precio_venta: e.target.value })} />
                      </label>
                      <label>
                        % Comisión
                        <input type="number" min={0} step="0.1" value={edicionOp.comision_pct} onChange={(e) => setEdicionOp({ ...edicionOp, comision_pct: e.target.value })} />
                      </label>
                      <button type="button" className="btn-ghost" onClick={() => guardarEdicionOp(op.id, "recalcular")}>Recalcular bruto</button>
                    </div>
                  </div>
                )}

                {operacionAbierta === op.id && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirGasto(op.id, e)}>
                      <label>
                        Concepto
                        <input required value={nuevoGasto.concepto} onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })} placeholder="Certificado energético, reforma..." />
                      </label>
                      <label>
                        Importe (€)
                        <input type="number" min={0} required value={nuevoGasto.importe} onChange={(e) => setNuevoGasto({ ...nuevoGasto, importe: e.target.value })} />
                      </label>
                      <label>
                        Categoría
                        <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}>
                          {CATEGORIAS_GASTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </label>
                      <button type="submit" className="btn-primary">Añadir gasto</button>
                    </form>
                    {(gastos[op.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {g.es_negativo ? "-" : "+"}{fmt(g.importe)} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span></span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoPagado(op.id, g.id, e.target.checked)} />
                            Liquidado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGasto(op.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(gastos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin movimientos registrados todavía.</p>}

                    <div className="lead-form-row" style={{ marginTop: 16 }}>
                      <label style={{ flex: 1 }}>
                        Adjuntar documento (PDF)
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          disabled={subiendoDocumento}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              await subirDocumento(op.id, file);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>
                    {(documentos[op.id] ?? []).map((doc) => (
                      <div key={doc.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <a href={`/api/admin/documentos/${doc.id}`} target="_blank" rel="noreferrer">
                          {doc.nombre}
                        </a>
                        <button type="button" className="btn-ghost" onClick={() => eliminarDocumento(op.id, doc.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(documentos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin documentos adjuntos. Súbelos aquí para poder pedírselos luego al bot de Telegram.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
