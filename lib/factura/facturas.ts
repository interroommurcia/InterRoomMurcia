import { getSupabaseAdmin } from "../supabaseAdmin";
import { EMISOR, IVA_PCT } from "./emisor";
import { calcularTotales } from "./calculo";
import { renderFacturaPdf } from "./pdf";
import { setUltimoNumero } from "./numeracion";
import type { Factura, NuevaFacturaInput } from "./tipos";

const BUCKET = "facturas";

function sanitize(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
}

// Nombre de archivo pedido: mes-año y DNI del cliente. Se añade el número de
// factura saneado para que dos facturas del mismo cliente y mes no colisionen.
function nombreArchivo(input: { fecha: string; cliente_nif?: string | null; numero: string }): string {
  const d = new Date(input.fecha);
  const mesAnio = `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
  const dni = sanitize(input.cliente_nif || "sin-dni");
  const num = sanitize(input.numero);
  return `${mesAnio}_${dni}_${num}.pdf`;
}

function rowToFactura(r: Record<string, unknown>): Factura {
  return {
    ...(r as Factura),
    base: Number(r.base),
    iva_pct: Number(r.iva_pct),
    iva_importe: Number(r.iva_importe),
    irpf_pct: Number(r.irpf_pct),
    irpf_importe: Number(r.irpf_importe),
    total: Number(r.total),
    lineas: (r.lineas as Factura["lineas"]) ?? [],
  };
}

export async function crearFactura(input: NuevaFacturaInput): Promise<Factura> {
  const admin = getSupabaseAdmin();
  const ivaPct = input.iva_pct ?? IVA_PCT;
  const irpfPct = input.irpf_pct ?? (input.es_empresa ? 15 : 0);
  const { base, iva_importe, irpf_importe, total } = calcularTotales(input.lineas, ivaPct, irpfPct);

  const { data, error } = await admin
    .from("facturas")
    .insert({
      numero: input.numero,
      cliente_id: input.cliente_id ?? null,
      origen: input.origen ?? "manual",
      origen_id: input.origen_id ?? null,
      fecha: input.fecha,
      concepto: input.concepto,
      emisor_nombre: EMISOR.nombre,
      emisor_nif: EMISOR.nif,
      cliente_nombre: input.cliente_nombre,
      cliente_nif: input.cliente_nif ?? null,
      cliente_direccion: input.cliente_direccion ?? null,
      cliente_cp_ciudad: input.cliente_cp_ciudad ?? null,
      cliente_telefono: input.cliente_telefono ?? null,
      es_empresa: input.es_empresa,
      base,
      iva_pct: ivaPct,
      iva_importe,
      irpf_pct: irpfPct,
      irpf_importe,
      total,
      lineas: input.lineas,
    })
    .select()
    .single();
  if (error) throw error;
  const factura = rowToFactura(data);

  // Render + guardado del PDF. Si algo falla aquí la factura queda registrada
  // sin PDF (se puede regenerar), pero no perdemos el asiento.
  const pdf = await renderFacturaPdf(factura);
  const path = `${factura.cliente_id ?? "sin-cliente"}/${nombreArchivo(input)}`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (!upErr) {
    await admin.from("facturas").update({ storage_path: path }).eq("id", factura.id);
    factura.storage_path = path;
  } else {
    console.warn("[factura/upload]", upErr.message);
  }

  await setUltimoNumero(input.numero);
  return factura;
}

export async function listarFacturas(clienteId?: string): Promise<Factura[]> {
  const admin = getSupabaseAdmin();
  let q = admin.from("facturas").select("*").order("created_at", { ascending: false });
  if (clienteId) q = q.eq("cliente_id", clienteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToFactura);
}

export async function getFactura(id: string): Promise<Factura | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("facturas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToFactura(data) : null;
}

// Descarga el PDF: lo baja del bucket si existe, o lo regenera al vuelo.
export async function descargarFacturaPdf(id: string): Promise<{ nombre: string; buffer: Buffer } | null> {
  const admin = getSupabaseAdmin();
  const factura = await getFactura(id);
  if (!factura) return null;
  const nombre = `Factura-${sanitize(factura.numero)}.pdf`;
  if (factura.storage_path) {
    const { data } = await admin.storage.from(BUCKET).download(factura.storage_path);
    if (data) return { nombre, buffer: Buffer.from(await data.arrayBuffer()) };
  }
  return { nombre, buffer: await renderFacturaPdf(factura) };
}

export async function eliminarFactura(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const factura = await getFactura(id);
  if (factura?.storage_path) {
    await admin.storage.from(BUCKET).remove([factura.storage_path]).catch(() => {});
  }
  const { error } = await admin.from("facturas").delete().eq("id", id);
  if (error) throw error;
}

// Borra facturas (fila + PDF) con más de 6 meses. Usado por el cron.
export async function limpiarFacturasAntiguas(): Promise<number> {
  const admin = getSupabaseAdmin();
  const limite = new Date();
  limite.setMonth(limite.getMonth() - 6);
  const { data, error } = await admin
    .from("facturas")
    .select("id, storage_path")
    .lt("created_at", limite.toISOString());
  if (error) throw error;
  const filas = data ?? [];
  const paths = filas.map((f) => f.storage_path as string | null).filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(BUCKET).remove(paths).catch(() => {});
  if (filas.length) {
    await admin.from("facturas").delete().in("id", filas.map((f) => f.id as string));
  }
  return filas.length;
}
