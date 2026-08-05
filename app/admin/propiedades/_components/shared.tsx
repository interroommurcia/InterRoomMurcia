export type Habitacion = {
  id: string;
  nombre: string;
  precio: number | null;
  cliente_id: string | null;
  clienteNombre: string | null;
  libre_enero: boolean;
  orden: number;
};

export type Media = { id: string; tipo: "foto" | "video"; url: string; habitacion_id: string | null };

export type Propiedad = {
  id: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  num_habitaciones: number;
  num_banos: number;
  precio_total: number | null;
  notas: string | null;
  servicio_wifi: boolean;
  servicio_limpieza: boolean;
  servicio_luz: boolean;
  servicio_agua: boolean;
  tiene_garaje: boolean;
  precio_garaje: number | null;
  libre_enero: boolean;
  propietario_id: string | null;
  valor_compra: number | null;
  habitaciones: Habitacion[];
  media: Media[];
};

export type Cliente = { id: string; nombre: string; apellidos: string | null; tipo?: string };

export const NUEVA: Omit<Propiedad, "id" | "habitaciones" | "media"> = {
  tipo: "piso",
  nombre: "",
  direccion: "",
  num_habitaciones: 0,
  num_banos: 0,
  precio_total: null,
  notas: "",
  servicio_wifi: false,
  servicio_limpieza: false,
  servicio_luz: false,
  servicio_agua: false,
  tiene_garaje: false,
  precio_garaje: null,
  libre_enero: false,
  propietario_id: null,
  valor_compra: null,
};

export const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
  fontFamily: FONT,
  background: "#fff",
};

export function totalConGaraje(p: { precio_total: number | null; tiene_garaje: boolean; precio_garaje: number | null }) {
  const base = p.precio_total ?? 0;
  const gar = p.tiene_garaje && p.precio_garaje ? p.precio_garaje : 0;
  return base + gar;
}

export function descripcionConServicios(p: Propiedad) {
  const servicios: string[] = [];
  if (p.servicio_wifi) servicios.push("wifi");
  if (p.servicio_limpieza) servicios.push("limpieza");
  if (p.servicio_luz) servicios.push("luz");
  if (p.servicio_agua) servicios.push("agua");
  const extras: string[] = [];
  if (servicios.length) extras.push(`Incluye: ${servicios.join(", ")}.`);
  if (p.tiene_garaje) extras.push(`Plaza de garaje disponible${p.precio_garaje ? ` (+${p.precio_garaje}€/mes)` : ""}.`);
  return [p.notas ?? "", ...extras].filter(Boolean).join("\n\n");
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
      {label}
      {children}
    </label>
  );
}

export function ServicioTag({ label }: { label: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#eff6ff", color: "#1e40af", fontWeight: 500 }}>
      {label}
    </span>
  );
}

export function Bloque({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{titulo}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>{sub}</div>}
      {children}
    </div>
  );
}
