import { IVA_PCT } from "./emisor";
import type { LineaFactura } from "./tipos";

const r2 = (n: number) => Math.round(n * 100) / 100;

// Las comisiones guardadas en contabilidad ya incluyen el 21% de IVA
// (ver calcularComision en lib/contabilidad.ts). Para la factura necesitamos
// la base imponible sin IVA.
export function baseDesdeComisionConIva(comisionConIva: number): number {
  return r2(comisionConIva / (1 + IVA_PCT / 100));
}

export function calcularTotales(lineas: LineaFactura[], ivaPct: number, irpfPct: number) {
  const base = r2(lineas.reduce((s, l) => s + Number(l.base || 0), 0));
  const iva_importe = r2(base * (ivaPct / 100));
  const irpf_importe = r2(base * (irpfPct / 100));
  const total = r2(base + iva_importe - irpf_importe);
  return { base, iva_importe, irpf_importe, total };
}
