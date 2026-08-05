"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Habitacion = {
  id: string;
  nombre: string;
  precio: number | null;
  cliente_id: string | null;
  clienteNombre: string | null;
  libre_enero: boolean;
  orden: number;
};
type Media = { id: string; tipo: "foto" | "video"; url: string; habitacion_id: string | null };
type Propiedad = {
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
type Cliente = { id: string; nombre: string; apellidos: string | null; tipo?: string };

const NUEVA: Omit<Propiedad, "id" | "habitaciones" | "media"> = {
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

function totalConGaraje(p: { precio_total: number | null; tiene_garaje: boolean; precio_garaje: number | null }) {
  const base = p.precio_total ?? 0;
  const gar = p.tiene_garaje && p.precio_garaje ? p.precio_garaje : 0;
  return base + gar;
}

function descripcionConServicios(p: Propiedad) {
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

const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export default function PropiedadesManager() {
  const [props, setProps] = useState<Propiedad[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nueva, setNueva] = useState(NUEVA);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);

  async function cargar() {
    const [p, c] = await Promise.all([
      fetch("/api/admin/propiedades").then((r) => r.json()),
      fetch("/api/admin/clientes").then((r) => r.json()),
    ]);
    setProps(Array.isArray(p) ? p : []);
    setClientes(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nueva.nombre.trim()) return;
    await fetch("/api/admin/propiedades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    setNueva(NUEVA);
    setMostrarForm(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta propiedad? Se borrarán también sus fotos, vídeos y habitaciones.")) return;
    await fetch(`/api/admin/propiedades/${id}`, { method: "DELETE" });
    cargar();
  }

  async function actualizarProp(id: string, patch: Partial<Propiedad>) {
    await fetch(`/api/admin/propiedades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    cargar();
  }

  async function crearHab(propId: string, nombre: string) {
    if (!nombre.trim()) return;
    await fetch(`/api/admin/propiedades/${propId}/habitaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    cargar();
  }

  async function actualizarHab(id: string, patch: Partial<Habitacion>) {
    await fetch(`/api/admin/propiedades/habitaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    cargar();
  }

  async function eliminarHab(id: string) {
    if (!confirm("¿Eliminar esta habitación?")) return;
    await fetch(`/api/admin/propiedades/habitaciones/${id}`, { method: "DELETE" });
    cargar();
  }

  async function subirArchivo(propId: string, file: File, tipo: "foto" | "video", habitacion_id?: string | null) {
    setSubiendo(propId + (habitacion_id ?? ""));
    try {
      const initRes = await fetch(`/api/admin/propiedades/${propId}/media/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, tipo, habitacion_id: habitacion_id ?? null }),
      });
      const init = await initRes.json();
      if (!initRes.ok || !init.path) throw new Error(init.error || "No se pudo iniciar la subida");
      const up = await supabase.storage.from("propiedades").uploadToSignedUrl(init.path, init.token, file, {
        contentType: file.type || (tipo === "video" ? "video/mp4" : "image/jpeg"),
      });
      if (up.error) throw up.error;
      const reg = await fetch(`/api/admin/propiedades/${propId}/media/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: init.path, tipo, habitacion_id: habitacion_id ?? null }),
      });
      if (!reg.ok) throw new Error("No se pudo registrar el archivo");
      await cargar();
    } catch (e) {
      alert("Error subiendo archivo: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubiendo(null);
    }
  }

  async function eliminarMedia(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await fetch(`/api/admin/propiedades/media/${id}`, { method: "DELETE" });
    cargar();
  }

  if (loading) return <p className="admin-empty" style={{ fontFamily: FONT }}>Cargando...</p>;

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
          {props.length} propiedad{props.length === 1 ? "" : "es"}
        </h2>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: mostrarForm ? "#f3f4f6" : "var(--orange)",
            color: mostrarForm ? "#374151" : "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: FONT,
          }}
        >
          {mostrarForm ? "Cancelar" : "+ Nueva propiedad"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={crear} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Tipo">
              <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })} style={inputStyle}>
                <option value="piso">Piso</option>
                <option value="casa">Casa</option>
                <option value="estudio">Estudio</option>
                <option value="chalet">Chalet</option>
              </select>
            </Field>
            <Field label="Nombre">
              <input required value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Ej. Piso Guadalupe 3B" style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input value={nueva.direccion ?? ""} onChange={(e) => setNueva({ ...nueva, direccion: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Habitaciones">
              <input type="number" min={0} value={nueva.num_habitaciones} onChange={(e) => setNueva({ ...nueva, num_habitaciones: Number(e.target.value) })} style={inputStyle} />
            </Field>
            <Field label="Baños">
              <input type="number" min={0} value={nueva.num_banos} onChange={(e) => setNueva({ ...nueva, num_banos: Number(e.target.value) })} style={inputStyle} />
            </Field>
            <Field label="Precio total (€)">
              <input type="number" min={0} step="0.01" value={nueva.precio_total ?? ""} onChange={(e) => setNueva({ ...nueva, precio_total: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notas">
              <textarea value={nueva.notas ?? ""} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
            </Field>
          </div>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button type="submit" style={{ padding: "8px 20px", borderRadius: 8, background: "var(--orange)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: FONT }}>Guardar</button>
          </div>
        </form>
      )}

      {props.length === 0 ? (
        <p style={{ color: "#9ca3af", padding: 24, textAlign: "center" }}>Aún no hay propiedades captadas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {props.map((p) => (
            <PropiedadCard
              key={p.id}
              p={p}
              clientes={clientes}
              abierta={abierta === p.id}
              onToggle={() => setAbierta(abierta === p.id ? null : p.id)}
              onEliminar={() => eliminar(p.id)}
              onActualizar={(patch) => actualizarProp(p.id, patch)}
              onCrearHab={(nombre) => crearHab(p.id, nombre)}
              onActualizarHab={actualizarHab}
              onEliminarHab={eliminarHab}
              onSubir={(f, t, hid) => subirArchivo(p.id, f, t, hid)}
              onEliminarMedia={eliminarMedia}
              subiendoKey={subiendo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 14,
  fontFamily: FONT,
  background: "#fff",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
      {label}
      {children}
    </label>
  );
}

function PropiedadCard({
  p,
  clientes,
  abierta,
  onToggle,
  onEliminar,
  onActualizar,
  onCrearHab,
  onActualizarHab,
  onEliminarHab,
  onSubir,
  onEliminarMedia,
  subiendoKey,
}: {
  p: Propiedad;
  clientes: Cliente[];
  abierta: boolean;
  onToggle: () => void;
  onEliminar: () => void;
  onActualizar: (patch: Partial<Propiedad>) => void;
  onCrearHab: (nombre: string) => void;
  onActualizarHab: (id: string, patch: Partial<Habitacion>) => void;
  onEliminarHab: (id: string) => void;
  onSubir: (file: File, tipo: "foto" | "video", habitacion_id?: string | null) => void;
  onEliminarMedia: (id: string) => void;
  subiendoKey: string | null;
}) {
  const [nuevaHab, setNuevaHab] = useState("");
  const [borrador, setBorrador] = useState<Partial<Propiedad>>({});
  const dirty = Object.keys(borrador).length > 0;
  function set<K extends keyof Propiedad>(k: K, v: Propiedad[K]) {
    setBorrador((b) => ({ ...b, [k]: v }));
  }
  function val<K extends keyof Propiedad>(k: K): Propiedad[K] {
    return (k in borrador ? borrador[k] : p[k]) as Propiedad[K];
  }
  async function guardar() {
    if (!dirty) return;
    if (!confirm("¿Estás seguro de que quieres guardar los cambios?")) return;
    await onActualizar(borrador);
    setBorrador({});
  }
  const propView = { ...p, ...borrador };
  const mediaGeneral = p.media.filter((m) => !m.habitacion_id);
  const portada = mediaGeneral.find((m) => m.tipo === "foto") ?? p.media.find((m) => m.tipo === "foto");

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: FONT }}>
      <div style={{ display: "flex", gap: 20, padding: 20, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ width: 180, height: 130, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", flexShrink: 0 }}>
          {portada ? (
            <img src={portada.url} alt={propView.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#111827" }}>{propView.nombre}{dirty && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--orange)", fontWeight: 500 }}>· sin guardar</span>}</h3>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, textTransform: "capitalize" }}>
              {propView.tipo} · {propView.num_habitaciones} hab · {propView.num_banos} baños
              {propView.precio_total ? ` · ${totalConGaraje(propView)}€/mes` : ""}
              {propView.tiene_garaje && propView.precio_garaje ? ` (piso ${propView.precio_total}€ + garaje ${propView.precio_garaje}€)` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {propView.servicio_wifi && <ServicioTag label="Wifi" />}
              {propView.servicio_limpieza && <ServicioTag label="Limpieza" />}
              {propView.servicio_luz && <ServicioTag label="Luz" />}
              {propView.servicio_agua && <ServicioTag label="Agua" />}
              {propView.tiene_garaje && <ServicioTag label="Garaje" />}
              {propView.libre_enero && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#fef3c7", color: "#92400e", fontWeight: 500 }}>Libre en Enero</span>}
            </div>
            {propView.direccion && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{propView.direccion}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {p.habitaciones.map((h) => (
              <span key={h.id} style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 12,
                background: h.cliente_id ? "#fef3c7" : "#d1fae5",
                color: h.cliente_id ? "#92400e" : "#065f46",
              }}>
                {h.nombre}{h.precio ? ` · ${h.precio}€` : ""}{h.cliente_id ? ` · ${h.clienteNombre}` : " · libre"}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {abierta && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); guardar(); }}
              disabled={!dirty}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: dirty ? "var(--orange)" : "#e5e7eb",
                color: dirty ? "#fff" : "#9ca3af",
                cursor: dirty ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: FONT,
              }}
            >
              {dirty ? "Guardar cambios" : "Sin cambios"}
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onEliminar(); }} title="Eliminar" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, padding: 4 }}>×</button>
          <span style={{ color: "#9ca3af", fontSize: 12 }}>{abierta ? "▲ cerrar" : "▼ abrir"}</span>
        </div>
      </div>

      {abierta && (
        <div style={{ padding: 20, borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Nombre">
              <input value={val("nombre")} onChange={(e) => set("nombre", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input value={val("direccion") ?? ""} onChange={(e) => set("direccion", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Habitaciones">
              <input type="number" min={0} value={val("num_habitaciones")} onChange={(e) => set("num_habitaciones", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Baños">
              <input type="number" min={0} value={val("num_banos")} onChange={(e) => set("num_banos", Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Precio total (€)">
              <input type="number" min={0} step="0.01" value={val("precio_total") ?? ""} onChange={(e) => set("precio_total", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginBottom: 20 }}>
            <Field label="Notas">
              <textarea value={val("notas") ?? ""} onChange={(e) => set("notas", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} />
            </Field>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Servicios incluidos</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { key: "servicio_wifi" as const, label: "Wifi" },
                { key: "servicio_limpieza" as const, label: "Limpieza" },
                { key: "servicio_luz" as const, label: "Luz" },
                { key: "servicio_agua" as const, label: "Agua" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={val(key)} onChange={(e) => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Características</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={val("tiene_garaje")}
                  onChange={(e) => {
                    set("tiene_garaje", e.target.checked);
                    if (!e.target.checked) set("precio_garaje", null);
                  }}
                />
                Tiene garaje
              </label>
              {val("tiene_garaje") && (
                <Field label="Precio plaza garaje (€/mes)">
                  <input type="number" min={0} step="0.01" value={val("precio_garaje") ?? ""} onChange={(e) => set("precio_garaje", e.target.value ? Number(e.target.value) : null)} style={{ ...inputStyle, width: 180 }} />
                </Field>
              )}
              {val("tiene_garaje") && val("precio_garaje") && val("precio_total") && (
                <div style={{ fontSize: 13, color: "#065f46", background: "#d1fae5", padding: "6px 12px", borderRadius: 6, fontWeight: 500 }}>
                  Total con garaje: {totalConGaraje(propView)}€/mes
                </div>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={val("libre_enero")} onChange={(e) => set("libre_enero", e.target.checked)} />
                Se queda libre en Enero (rotación completa)
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Propietario y rentabilidad</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, alignItems: "end" }}>
              <Field label="Cliente propietario">
                <ClienteBuscador
                  clientes={clientes.filter((c) => c.tipo === "propietario")}
                  value={val("propietario_id")}
                  onChange={(id) => set("propietario_id", id)}
                  placeholderVacio="Sin asignar"
                />
              </Field>
              <Field label="Valor de compra (€) — para rentabilidad">
                <input type="number" min={0} step="1" value={val("valor_compra") ?? ""} onChange={(e) => set("valor_compra", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
              </Field>
            </div>
            {val("propietario_id") && !dirty && <EstadisticasPropietario propiedadId={p.id} />}
            {dirty && val("propietario_id") && <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>Guarda los cambios para ver las estadísticas actualizadas.</div>}
          </div>

          <Bloque titulo="Fotos generales" sub="Fachada, cocina, salón, exterior…">
            <MediaGrid media={mediaGeneral.filter((m) => m.tipo === "foto")} onDelete={onEliminarMedia} />
          </Bloque>
          <Bloque titulo="Vídeos generales">
            <MediaGrid media={mediaGeneral.filter((m) => m.tipo === "video")} onDelete={onEliminarMedia} />
          </Bloque>
          <UploadRow subiendo={subiendoKey === p.id} onFoto={(f) => onSubir(f, "foto", null)} onVideo={(f) => onSubir(f, "video", null)} />
          {mediaGeneral.length > 0 && (
            <PublicarBloque
              propiedadId={p.id}
              sugerencias={{ titulo: propView.nombre, precio: totalConGaraje(propView) || (propView.precio_total ?? 0), direccion: propView.direccion ?? "", descripcion: descripcionConServicios(propView) }}
              habitacionId={null}
              metros={null}
              label="Publicar propiedad entera en el catálogo"
            />
          )}

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#111827" }}>Habitaciones</div>
            {p.habitaciones.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0" }}>Sin habitaciones definidas.</p>}
            {p.habitaciones.map((h) => {
              const mediaHab = p.media.filter((m) => m.habitacion_id === h.id);
              const estudiantes = clientes.filter((c) => c.tipo === "estudiante");
              return (
                <div key={h.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 1.5fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                    <Field label="Habitación">
                      <input defaultValue={h.nombre} onBlur={(e) => e.target.value !== h.nombre && onActualizarHab(h.id, { nombre: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Precio (€)">
                      <input type="number" min={0} step="0.01" defaultValue={h.precio ?? ""} onBlur={(e) => onActualizarHab(h.id, { precio: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
                    </Field>
                    <Field label="Ocupada por (estudiante)">
                      <ClienteBuscador
                        clientes={estudiantes}
                        value={h.cliente_id}
                        onChange={(id) => onActualizarHab(h.id, { cliente_id: id })}
                        placeholderVacio="Libre"
                      />
                    </Field>
                    <button type="button" onClick={() => onEliminarHab(h.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, padding: 4, alignSelf: "center" }}>×</button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginBottom: 10, cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked={h.libre_enero} onChange={(e) => onActualizarHab(h.id, { libre_enero: e.target.checked })} />
                    Se queda libre en Enero (rotación)
                  </label>
                  <Bloque titulo="Fotos" sub={mediaHab.filter((m) => m.tipo === "foto").length === 0 ? "Sin fotos aún." : undefined}>
                    <MediaGrid media={mediaHab.filter((m) => m.tipo === "foto")} onDelete={onEliminarMedia} pequenio />
                  </Bloque>
                  <Bloque titulo="Vídeos" sub={mediaHab.filter((m) => m.tipo === "video").length === 0 ? "Sin vídeos aún." : undefined}>
                    <MediaGrid media={mediaHab.filter((m) => m.tipo === "video")} onDelete={onEliminarMedia} pequenio />
                  </Bloque>
                  <UploadRow
                    subiendo={subiendoKey === p.id + h.id}
                    onFoto={(f) => onSubir(f, "foto", h.id)}
                    onVideo={(f) => onSubir(f, "video", h.id)}
                    labelFoto="+ Foto de esta habitación"
                    labelVideo="+ Vídeo"
                  />
                  {!h.cliente_id && mediaHab.length > 0 && (
                    <PublicarBloque
                      propiedadId={p.id}
                      habitacionId={h.id}
                      sugerencias={{ titulo: `${h.nombre} en ${propView.nombre}`, precio: h.precio ?? 0, direccion: propView.direccion ?? "", descripcion: propView.notas ?? "" }}
                      metros={null}
                      label="Publicar esta habitación en el catálogo"
                    />
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={nuevaHab} onChange={(e) => setNuevaHab(e.target.value)} placeholder="Nueva habitación (ej. Master, H1)" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={() => { onCrearHab(nuevaHab); setNuevaHab(""); }} style={{ padding: "8px 16px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontFamily: FONT }}>Añadir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClienteBuscador({
  clientes,
  value,
  onChange,
  placeholderVacio,
}: {
  clientes: Cliente[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholderVacio: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const seleccionado = clientes.find((c) => c.id === value);
  const filtrados = query
    ? clientes.filter((c) => `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    : clientes;
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span style={{ color: seleccionado ? "#111827" : "#9ca3af" }}>
          {seleccionado ? `${seleccionado.nombre} ${seleccionado.apellidos ?? ""}`.trim() : placeholderVacio}
        </span>
        <span style={{ color: "#9ca3af", fontSize: 10 }}>▼</span>
      </button>
      {abierto && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 20, maxHeight: 260, overflow: "auto" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            style={{ ...inputStyle, border: "none", borderBottom: "1px solid #e5e7eb", borderRadius: 0, position: "sticky", top: 0, background: "#fff" }}
          />
          <div
            onClick={() => { onChange(null); setAbierto(false); setQuery(""); }}
            style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, color: "#9ca3af", borderBottom: "1px solid #f3f4f6" }}
          >
            {placeholderVacio}
          </div>
          {filtrados.length === 0 ? (
            <div style={{ padding: "12px", fontSize: 12, color: "#9ca3af" }}>Sin resultados.</div>
          ) : (
            filtrados.map((c) => (
              <div
                key={c.id}
                onClick={() => { onChange(c.id); setAbierto(false); setQuery(""); }}
                style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, background: c.id === value ? "#eff6ff" : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = c.id === value ? "#eff6ff" : "transparent")}
              >
                {c.nombre} {c.apellidos ?? ""}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EstadisticasPropietario({ propiedadId }: { propiedadId: string }) {
  const [stats, setStats] = useState<{ ganado_propietario: number; ganado_nosotros: number; total_bruto: number; renta_anual_estimada: number; rentabilidad_pct: number | null; meses_registrados: number } | null>(null);
  useEffect(() => {
    fetch(`/api/admin/propiedades/${propiedadId}/estadisticas`).then((r) => r.json()).then(setStats).catch(() => setStats(null));
  }, [propiedadId]);
  if (!stats) return <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>Cargando estadísticas…</div>;
  const eur = (n: number) => `${Math.round(n).toLocaleString("es-ES")}€`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12 }}>
      <StatCard label="Ganado por el propietario" value={eur(stats.ganado_propietario)} sub={`${stats.meses_registrados} meses`} />
      <StatCard label="Ganado nosotros" value={eur(stats.ganado_nosotros)} sub="comisiones" tono="orange" />
      <StatCard label="Renta anual estimada" value={eur(stats.renta_anual_estimada)} sub="12 × precio total" />
      <StatCard label="Rentabilidad bruta" value={stats.rentabilidad_pct !== null ? `${stats.rentabilidad_pct.toFixed(2)}%` : "—"} sub={stats.rentabilidad_pct !== null ? "renta / valor compra" : "añade valor compra"} tono="green" />
    </div>
  );
}

function StatCard({ label, value, sub, tono }: { label: string; value: string; sub?: string; tono?: "orange" | "green" }) {
  const bg = tono === "orange" ? "#fff7ed" : tono === "green" ? "#ecfdf5" : "#f9fafb";
  const color = tono === "orange" ? "#c2410c" : tono === "green" ? "#065f46" : "#111827";
  return (
    <div style={{ background: bg, borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ServicioTag({ label }: { label: string }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "#eff6ff", color: "#1e40af", fontWeight: 500 }}>
      {label}
    </span>
  );
}

function Bloque({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{titulo}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>{sub}</div>}
      {children}
    </div>
  );
}

function MediaGrid({ media, onDelete, pequenio }: { media: Media[]; onDelete: (id: string) => void; pequenio?: boolean }) {
  if (media.length === 0) return <div style={{ fontSize: 12, color: "#9ca3af", padding: "8px 0" }}>Sin archivos aún.</div>;
  const size = pequenio ? 72 : 100;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
      {media.map((m) => (
        <div key={m.id} style={{ position: "relative", width: size, height: size, borderRadius: 6, overflow: "hidden", background: "#000" }}>
          {m.tipo === "foto" ? (
            <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <video src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
          )}
          <div style={{ position: "absolute", top: 2, right: 2, display: "flex", gap: 2 }}>
            <a
              href={`/api/admin/propiedades/media/${m.id}/download`}
              title="Descargar"
              style={{ background: "rgba(255,255,255,0.95)", borderRadius: 999, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", fontSize: 12, textDecoration: "none" }}
            >↓</a>
            <button
              type="button"
              onClick={() => onDelete(m.id)}
              title="Eliminar"
              style={{ background: "rgba(255,255,255,0.95)", border: "none", borderRadius: 999, width: 22, height: 22, cursor: "pointer", color: "var(--orange)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadRow({
  subiendo,
  onFoto,
  onVideo,
  labelFoto = "+ Foto",
  labelVideo = "+ Vídeo",
}: {
  subiendo: boolean;
  onFoto: (f: File) => void;
  onVideo: (f: File) => void;
  labelFoto?: string;
  labelVideo?: string;
}) {
  const btn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: subiendo ? "wait" : "pointer",
    fontSize: 13,
    color: "#374151",
    fontFamily: FONT,
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label style={btn}>
        {subiendo ? "Subiendo…" : labelFoto}
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onFoto(e.target.files[0])} disabled={subiendo} />
      </label>
      <label style={btn}>
        {subiendo ? "Subiendo…" : labelVideo}
        <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} disabled={subiendo} />
      </label>
    </div>
  );
}

function PublicarBloque({
  propiedadId,
  habitacionId,
  sugerencias,
  metros,
  label,
}: {
  propiedadId: string;
  habitacionId: string | null;
  sugerencias: { titulo: string; precio: number; direccion: string; descripcion: string };
  metros: number | null;
  label: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [zona, setZona] = useState<"ucam" | "umu" | "upct">("umu");
  const [titulo, setTitulo] = useState(sugerencias.titulo);
  const [precio, setPrecio] = useState(sugerencias.precio || 0);
  const [barrio, setBarrio] = useState(sugerencias.direccion);
  const [descripcion, setDescripcion] = useState(sugerencias.descripcion || "");
  const [publicando, setPublicando] = useState(false);
  const [resultado, setResultado] = useState<{ url: string } | null>(null);

  async function publicar() {
    if (!titulo || !barrio || !descripcion || !precio) {
      alert("Faltan datos: título, barrio, descripción y precio son obligatorios.");
      return;
    }
    setPublicando(true);
    const res = await fetch(`/api/admin/propiedades/${propiedadId}/publicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitacion_id: habitacionId, zona, titulo, barrio, precio_mes: precio, metros, descripcion }),
    });
    const data = await res.json();
    setPublicando(false);
    if (data.ok) setResultado({ url: data.url });
    else alert(data.error || "No se pudo publicar");
  }

  if (resultado) {
    return (
      <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "#d1fae5", color: "#065f46", fontSize: 13 }}>
        ✓ Publicado. <a href={resultado.url} target="_blank" rel="noopener noreferrer" style={{ color: "#047857", fontWeight: 600 }}>Ver en catálogo →</a>{" "}
        <a href="/admin/pisos" style={{ color: "#047857", marginLeft: 8 }}>Editar en catálogo</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--orange)",
          background: abierto ? "var(--orange-light)" : "#fff",
          color: "var(--orange)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: FONT,
        }}
      >
        {abierto ? "Cancelar" : label}
      </button>
      {abierto && (
        <div style={{ marginTop: 10, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            Se creará un anuncio en el catálogo con la primera foto disponible como portada. Podrás ajustar detalles después en <b>/admin/pisos</b>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <Field label="Zona (campus)">
              <select value={zona} onChange={(e) => setZona(e.target.value as "ucam" | "umu" | "upct")} style={inputStyle}>
                <option value="ucam">UCAM</option>
                <option value="umu">UMU</option>
                <option value="upct">UPCT</option>
              </select>
            </Field>
            <Field label="Título del anuncio">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Barrio">
              <input value={barrio} onChange={(e) => setBarrio(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Precio/mes (€)">
              <input type="number" min={0} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Descripción">
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} placeholder="Describe la propiedad para el anuncio…" />
            </Field>
          </div>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button type="button" disabled={publicando} onClick={publicar} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--orange)", color: "#fff", border: "none", cursor: publicando ? "wait" : "pointer", fontSize: 14, fontWeight: 500, fontFamily: FONT }}>
              {publicando ? "Publicando…" : "Publicar en catálogo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
