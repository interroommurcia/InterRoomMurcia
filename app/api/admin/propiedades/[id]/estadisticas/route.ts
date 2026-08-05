import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdmin();
  const { data: prop } = await admin
    .from("propiedades")
    .select("propietario_id, precio_total, precio_garaje, tiene_garaje, valor_compra")
    .eq("id", params.id)
    .maybeSingle();

  if (!prop?.propietario_id) {
    return NextResponse.json({ propietario_id: null, ganado_propietario: 0, ganado_nosotros: 0, renta_anual_estimada: 0, rentabilidad_pct: null, meses_registrados: 0 });
  }

  const { data: ingresos } = await admin
    .from("cliente_ingresos")
    .select("ingreso_bruto, comision_calculada")
    .eq("cliente_id", prop.propietario_id);

  const rows = (ingresos ?? []) as { ingreso_bruto: number; comision_calculada: number }[];
  const ganado_nosotros = rows.reduce((s, r) => s + Number(r.comision_calculada || 0), 0);
  const total_bruto = rows.reduce((s, r) => s + Number(r.ingreso_bruto || 0), 0);
  const ganado_propietario = total_bruto - ganado_nosotros;

  const rentaMensual = Number(prop.precio_total || 0) + (prop.tiene_garaje ? Number(prop.precio_garaje || 0) : 0);
  const renta_anual_estimada = rentaMensual * 12;
  const rentabilidad_pct = prop.valor_compra ? (renta_anual_estimada / Number(prop.valor_compra)) * 100 : null;

  return NextResponse.json({
    propietario_id: prop.propietario_id,
    ganado_propietario,
    ganado_nosotros,
    total_bruto,
    renta_anual_estimada,
    rentabilidad_pct,
    meses_registrados: rows.length,
  });
}
