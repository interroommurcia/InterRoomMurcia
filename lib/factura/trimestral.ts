import { getSupabaseAdmin } from "../supabaseAdmin";
import { listarSubidas } from "./subidas";

const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export type EmitidaTrim = {
  tipo: "emitida";
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  concepto: string;
  base: number;
  iva_importe: number;
  total: number;
};

export type SubidaTrim = {
  tipo: "subida";
  id: string;
  fecha: string;
  concepto: string;
  importe: number | null;
  nombre_archivo: string;
};

export type MesTrim = {
  mes: number; // 1-12
  nombre: string;
  emitidas: EmitidaTrim[];
  subidas: SubidaTrim[];
  totalBase: number;
  totalIva: number;
  totalEmitidas: number;
  totalSubidas: number;
};

export type TrimestreTrim = {
  trimestre: number; // 1-4
  meses: MesTrim[];
  totalBase: number;
  totalIva: number;
  totalEmitidas: number;
  totalSubidas: number;
};

export type TrimestralView = {
  anio: number;
  aniosDisponibles: number[];
  trimestres: TrimestreTrim[];
  totalAnual: { base: number; iva: number; emitidas: number; subidas: number; numEmitidas: number; numSubidas: number };
};

function mesDeFecha(fecha: string): number {
  return new Date(fecha).getUTCMonth(); // 0-11
}

export async function construirTrimestral(anio: number): Promise<TrimestralView> {
  const admin = getSupabaseAdmin();

  // Facturas emitidas COBRADAS del año (se agrupan por el mes de su fecha).
  const { data: emiRows, error: emiErr } = await admin
    .from("facturas")
    .select("id, numero, fecha, cliente_nombre, concepto, base, iva_importe, total, cobrada")
    .eq("cobrada", true)
    .gte("fecha", `${anio}-01-01`)
    .lte("fecha", `${anio}-12-31`)
    .order("fecha", { ascending: true });
  if (emiErr) throw emiErr;

  const subidas = await listarSubidas(anio);

  // Años disponibles: unión de años de facturas cobradas y de subidas.
  const [{ data: aniosEmi }, { data: aniosSub }] = await Promise.all([
    admin.from("facturas").select("fecha").eq("cobrada", true),
    admin.from("facturas_subidas").select("fecha"),
  ]);
  const anios = new Set<number>();
  (aniosEmi ?? []).forEach((r) => anios.add(new Date(String(r.fecha)).getUTCFullYear()));
  (aniosSub ?? []).forEach((r) => anios.add(new Date(String(r.fecha)).getUTCFullYear()));
  anios.add(anio);
  anios.add(new Date().getUTCFullYear());
  const aniosDisponibles = [...anios].sort((a, b) => b - a);

  // Monta los 12 meses.
  const meses: MesTrim[] = NOMBRES_MES.map((nombre, i) => ({
    mes: i + 1, nombre, emitidas: [], subidas: [], totalBase: 0, totalIva: 0, totalEmitidas: 0, totalSubidas: 0,
  }));

  (emiRows ?? []).forEach((r) => {
    const m = meses[mesDeFecha(String(r.fecha))];
    const e: EmitidaTrim = {
      tipo: "emitida",
      id: String(r.id),
      numero: String(r.numero),
      fecha: String(r.fecha),
      cliente_nombre: String(r.cliente_nombre),
      concepto: String(r.concepto),
      base: Number(r.base),
      iva_importe: Number(r.iva_importe),
      total: Number(r.total),
    };
    m.emitidas.push(e);
    m.totalBase += e.base;
    m.totalIva += e.iva_importe;
    m.totalEmitidas += e.total;
  });

  subidas.forEach((s) => {
    const m = meses[mesDeFecha(s.fecha)];
    m.subidas.push({ tipo: "subida", id: s.id, fecha: s.fecha, concepto: s.concepto, importe: s.importe, nombre_archivo: s.nombre_archivo });
    m.totalSubidas += s.importe ?? 0;
  });

  // Agrupa en trimestres.
  const trimestres: TrimestreTrim[] = [1, 2, 3, 4].map((t) => {
    const ms = meses.slice((t - 1) * 3, t * 3);
    return {
      trimestre: t,
      meses: ms,
      totalBase: ms.reduce((s, m) => s + m.totalBase, 0),
      totalIva: ms.reduce((s, m) => s + m.totalIva, 0),
      totalEmitidas: ms.reduce((s, m) => s + m.totalEmitidas, 0),
      totalSubidas: ms.reduce((s, m) => s + m.totalSubidas, 0),
    };
  });

  const totalAnual = {
    base: trimestres.reduce((s, t) => s + t.totalBase, 0),
    iva: trimestres.reduce((s, t) => s + t.totalIva, 0),
    emitidas: trimestres.reduce((s, t) => s + t.totalEmitidas, 0),
    subidas: trimestres.reduce((s, t) => s + t.totalSubidas, 0),
    numEmitidas: (emiRows ?? []).length,
    numSubidas: subidas.length,
  };

  return { anio, aniosDisponibles, trimestres, totalAnual };
}
