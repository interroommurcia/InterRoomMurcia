// Cálculo del informe de rentabilidad express (alquiler por habitaciones).
// Compartido por la calculadora web (/rentabilidad/express) y el PDF que envía Gladis.

export const COMISION_HAB = 0.15;
export const IVA = 1.21;

export type EntradaRentabilidad = {
  habitaciones: number;
  precioHabitacion: number;
  /** Meses alquilados al año (1–12). 0 o vacío = 12. */
  meses?: number;
  /** €/mes de limpieza; null = sin servicio de limpieza. */
  limpieza?: number | null;
  /** €/mes de suministros + wifi; null = los paga el inquilino. */
  suministros?: number | null;
  /** Valor del piso; 0/null = no se calcula rentabilidad sobre valor. */
  valorPiso?: number | null;
};

export type ResultadoRentabilidad = {
  N: number;
  Rh: number;
  Mh: number;
  Cl: number;
  Gf: number;
  Vp: number;
  conLimpieza: boolean;
  conSuministros: boolean;
  bruto: number;
  com: number;
  neto: number;
  anual: number;
  brutoAnual: number;
  rentBruta: number | null;
  rentNeta: number | null;
};

const n0 = (x: number | null | undefined) => (typeof x === "number" && isFinite(x) ? x : 0);

export function calcularRentabilidad(e: EntradaRentabilidad): ResultadoRentabilidad {
  const N = Math.max(1, n0(e.habitaciones));
  const Rh = n0(e.precioHabitacion);
  const conLimpieza = e.limpieza !== null && e.limpieza !== undefined;
  const conSuministros = e.suministros !== null && e.suministros !== undefined;
  const Cl = conLimpieza ? n0(e.limpieza) : 0;
  const Gf = conSuministros ? n0(e.suministros) : 0;
  const Mh = Math.min(12, Math.max(1, n0(e.meses) || 12));
  const Vp = n0(e.valorPiso);

  const bruto = N * Rh;
  const com = bruto * COMISION_HAB * IVA;
  const neto = bruto - com - Cl - Gf;
  const anual = neto * Mh;
  const brutoAnual = bruto * Mh;
  const rentBruta = Vp > 0 ? (brutoAnual / Vp) * 100 : null;
  const rentNeta = Vp > 0 ? (anual / Vp) * 100 : null;

  return { N, Rh, Mh, Cl, Gf, Vp, conLimpieza, conSuministros, bruto, com, neto, anual, brutoAnual, rentBruta, rentNeta };
}

export const fmtEuro = (n: number) => (isFinite(n) ? `${Math.round(n).toLocaleString("es-ES")} €` : "—");
export const fmtPct = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
