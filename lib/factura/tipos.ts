export type OrigenFactura = "ingreso" | "compraventa" | "alquiler_comision" | "credito" | "manual";

// Un pago pendiente de facturar, normalizado desde cualquiera de las tablas de
// cobros. `base` ya viene sin IVA (lista para la factura).
export type PagoFacturable = {
  origen: OrigenFactura;
  origen_id: string;
  fecha: string;
  concepto: string;
  base: number;
  ya_facturado: boolean;
};

export type LineaFactura = { descripcion: string; base: number };

export type Factura = {
  id: string;
  numero: string;
  cliente_id: string | null;
  origen: OrigenFactura;
  origen_id: string | null;
  fecha: string;
  concepto: string;
  emisor_nombre: string;
  emisor_nif: string;
  cliente_nombre: string;
  cliente_nif: string | null;
  cliente_direccion: string | null;
  cliente_cp_ciudad: string | null;
  cliente_telefono: string | null;
  es_empresa: boolean;
  base: number;
  iva_pct: number;
  iva_importe: number;
  irpf_pct: number;
  irpf_importe: number;
  total: number;
  lineas: LineaFactura[];
  storage_path: string | null;
  created_at: string;
};

export type NuevaFacturaInput = {
  numero: string;
  cliente_id?: string | null;
  origen?: OrigenFactura;
  origen_id?: string | null;
  fecha: string; // YYYY-MM-DD
  concepto: string;
  cliente_nombre: string;
  cliente_nif?: string | null;
  cliente_direccion?: string | null;
  cliente_cp_ciudad?: string | null;
  cliente_telefono?: string | null;
  es_empresa: boolean;
  iva_pct?: number;
  irpf_pct?: number;
  lineas: LineaFactura[];
};
