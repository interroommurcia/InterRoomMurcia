import { getSupabaseAdmin } from "../supabaseAdmin";

export async function getUltimoNumero(): Promise<string | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("factura_config").select("ultimo_numero").eq("id", 1).maybeSingle();
  return (data?.ultimo_numero as string | null) ?? null;
}

export async function setUltimoNumero(numero: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("factura_config")
    .upsert({ id: 1, ultimo_numero: numero, updated_at: new Date().toISOString() });
}

// Sugiere el siguiente número a partir del último usado. Entiende formatos
// tipo "2026/8" (año/correlativo) y "8". Si cambia el año, reinicia a /1.
// Si no reconoce el patrón, devuelve el último tal cual para que lo edite.
export function sugerirSiguiente(ultimo: string | null): string {
  const anio = new Date().getFullYear();
  if (!ultimo) return `${anio}/1`;
  const conAnio = ultimo.match(/^(\d{4})\s*[/\-]\s*(\d+)$/);
  if (conAnio) {
    const anioPrev = Number(conAnio[1]);
    const n = Number(conAnio[2]);
    return anioPrev === anio ? `${anio}/${n + 1}` : `${anio}/1`;
  }
  const soloNum = ultimo.match(/^(\d+)$/);
  if (soloNum) return String(Number(soloNum[1]) + 1);
  return ultimo;
}

export async function sugerirNumero(): Promise<string> {
  return sugerirSiguiente(await getUltimoNumero());
}
