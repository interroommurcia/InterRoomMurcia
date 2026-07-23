import { listarLeads } from "./leads";
import { getSupabaseAdmin } from "./supabaseAdmin";
import type { Cliente } from "./contabilidad";

const DIAS_LEAD_PENDIENTE = 3;

export type Pendientes = {
  leadsSinContactar: { id: number; nombre: string; telefono: string; dias: number }[];
  telefonosIncompletos: { id: string; nombre: string; tipo: string }[];
  alquileresSinCobrar: { id: string; nombre: string; mensualidad: number; mes: string }[];
};

function telefonoValido(telefono: string | null) {
  if (!telefono) return false;
  return telefono.replace(/\D/g, "").length >= 9;
}

function primerDiaMesActual() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function calcularPendientes(): Promise<Pendientes> {
  const admin = getSupabaseAdmin();

  const [leads, { data: clientesData, error: clientesError }] = await Promise.all([
    listarLeads(),
    admin.from("clientes").select("*"),
  ]);
  if (clientesError) throw clientesError;
  const clientes = (clientesData ?? []) as Cliente[];

  const leadIdsConvertidos = new Set(clientes.map((c) => c.lead_id).filter((id): id is number => id != null));
  const ahora = Date.now();
  const leadsSinContactar = leads
    .filter((l) => !leadIdsConvertidos.has(l.id))
    .map((l) => ({ id: l.id, nombre: l.nombre, telefono: l.telefono, dias: Math.floor((ahora - new Date(l.created_at).getTime()) / 86400000) }))
    .filter((l) => l.dias >= DIAS_LEAD_PENDIENTE);

  const telefonosIncompletos = clientes
    .filter((c) => !telefonoValido(c.telefono))
    .map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo }));

  const mesActual = primerDiaMesActual();
  const { data: ingresosMes, error: ingresosError } = await admin
    .from("cliente_ingresos")
    .select("cliente_id, mes, ingreso_bruto")
    .eq("mes", mesActual)
    .eq("cobrado", false);
  if (ingresosError) throw ingresosError;

  const clientesPorId = new Map(clientes.map((c) => [c.id, c]));
  const alquileresSinCobrar = (ingresosMes ?? []).map((i) => ({
    id: i.cliente_id as string,
    nombre: clientesPorId.get(i.cliente_id as string)?.nombre ?? "Cliente desconocido",
    mensualidad: Number(i.ingreso_bruto),
    mes: i.mes as string,
  }));

  return { leadsSinContactar, telefonosIncompletos, alquileresSinCobrar };
}

export function formatearPendientes(p: Pendientes): string {
  const lineas: string[] = ["📋 Pendientes InterRoom Murcia"];

  if (p.leadsSinContactar.length) {
    lineas.push("\n🔴 Leads sin contactar (+3 días):");
    p.leadsSinContactar.forEach((l) => lineas.push(`- ${l.nombre} · ${l.telefono} · ${l.dias}d`));
  }

  if (p.telefonosIncompletos.length) {
    lineas.push("\n📵 Clientes con teléfono incompleto:");
    p.telefonosIncompletos.forEach((c) => lineas.push(`- ${c.nombre} (${c.tipo})`));
  }

  if (p.alquileresSinCobrar.length) {
    lineas.push("\n💰 Alquileres sin marcar cobrados este mes:");
    p.alquileresSinCobrar.forEach((a) => lineas.push(`- ${a.nombre}: ${a.mensualidad}€`));
  }

  if (!p.leadsSinContactar.length && !p.telefonosIncompletos.length && !p.alquileresSinCobrar.length) {
    lineas.push("\n✅ Nada pendiente ahora mismo.");
  }

  return lineas.join("\n");
}
