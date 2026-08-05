"use client";

import { useEffect, useState } from "react";

type Habitacion = {
  id: string;
  nombre: string;
  precio: number | null;
  cliente_id: string | null;
  clienteNombre: string | null;
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
  habitaciones: Habitacion[];
  media: Media[];
};
type Cliente = { id: string; nombre: string; apellidos: string | null };

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
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);
    if (habitacion_id) fd.append("habitacion_id", habitacion_id);
    await fetch(`/api/admin/propiedades/${propId}/media`, { method: "POST", body: fd });
    setSubiendo(null);
    cargar();
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
  const mediaGeneral = p.media.filter((m) => !m.habitacion_id);
  const portada = mediaGeneral.find((m) => m.tipo === "foto") ?? p.media.find((m) => m.tipo === "foto");

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: FONT }}>
      <div style={{ display: "flex", gap: 20, padding: 20, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ width: 180, height: 130, borderRadius: 8, background: "#f3f4f6", overflow: "hidden", flexShrink: 0 }}>
          {portada ? (
            <img src={portada.url} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#111827" }}>{p.nombre}</h3>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, textTransform: "capitalize" }}>
              {p.tipo} · {p.num_habitaciones} hab · {p.num_banos} baños
              {p.precio_total ? ` · ${totalConGaraje(p)}€/mes` : ""}
              {p.tiene_garaje && p.precio_garaje ? ` (piso ${p.precio_total}€ + garaje ${p.precio_garaje}€)` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {p.servicio_wifi && <ServicioTag label="Wifi" />}
              {p.servicio_limpieza && <ServicioTag label="Limpieza" />}
              {p.servicio_luz && <ServicioTag label="Luz" />}
              {p.servicio_agua && <ServicioTag label="Agua" />}
              {p.tiene_garaje && <ServicioTag label="Garaje" />}
            </div>
            {p.direccion && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{p.direccion}</div>}
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
          <button type="button" onClick={(e) => { e.stopPropagation(); onEliminar(); }} title="Eliminar" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, padding: 4 }}>×</button>
          <span style={{ color: "#9ca3af", fontSize: 12 }}>{abierta ? "▲ cerrar" : "▼ abrir"}</span>
        </div>
      </div>

      {abierta && (
        <div style={{ padding: 20, borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label="Nombre">
              <input defaultValue={p.nombre} onBlur={(e) => e.target.value !== p.nombre && onActualizar({ nombre: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input defaultValue={p.direccion ?? ""} onBlur={(e) => e.target.value !== (p.direccion ?? "") && onActualizar({ direccion: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Habitaciones">
              <input type="number" min={0} defaultValue={p.num_habitaciones} onBlur={(e) => Number(e.target.value) !== p.num_habitaciones && onActualizar({ num_habitaciones: Number(e.target.value) })} style={inputStyle} />
            </Field>
            <Field label="Baños">
              <input type="number" min={0} defaultValue={p.num_banos} onBlur={(e) => Number(e.target.value) !== p.num_banos && onActualizar({ num_banos: Number(e.target.value) })} style={inputStyle} />
            </Field>
            <Field label="Precio total (€)">
              <input type="number" min={0} step="0.01" defaultValue={p.precio_total ?? ""} onBlur={(e) => onActualizar({ precio_total: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginBottom: 20 }}>
            <Field label="Notas">
              <textarea defaultValue={p.notas ?? ""} rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 70 }} onBlur={(e) => onActualizar({ notas: e.target.value })} />
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
                  <input type="checkbox" defaultChecked={p[key]} onChange={(e) => onActualizar({ [key]: e.target.checked } as Partial<Propiedad>)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Características</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked={p.tiene_garaje} onChange={(e) => onActualizar({ tiene_garaje: e.target.checked, precio_garaje: e.target.checked ? p.precio_garaje : null })} />
                Tiene garaje
              </label>
              {p.tiene_garaje && (
                <Field label="Precio plaza garaje (€/mes)">
                  <input type="number" min={0} step="0.01" defaultValue={p.precio_garaje ?? ""} onBlur={(e) => onActualizar({ precio_garaje: e.target.value ? Number(e.target.value) : null })} style={{ ...inputStyle, width: 180 }} />
                </Field>
              )}
              {p.tiene_garaje && p.precio_garaje && p.precio_total && (
                <div style={{ fontSize: 13, color: "#065f46", background: "#d1fae5", padding: "6px 12px", borderRadius: 6, fontWeight: 500 }}>
                  Total con garaje: {totalConGaraje(p)}€/mes
                </div>
              )}
            </div>
          </div>

          <Bloque titulo="Fotos y vídeos generales" sub="De la propiedad completa (fachada, cocina, salón, exterior…)">
            <MediaGrid media={mediaGeneral} onDelete={onEliminarMedia} />
            <UploadRow subiendo={subiendoKey === p.id} onFoto={(f) => onSubir(f, "foto", null)} onVideo={(f) => onSubir(f, "video", null)} />
            {mediaGeneral.length > 0 && (
              <PublicarBloque
                propiedadId={p.id}
                sugerencias={{ titulo: p.nombre, precio: totalConGaraje(p) || (p.precio_total ?? 0), direccion: p.direccion ?? "", descripcion: descripcionConServicios(p) }}
                habitacionId={null}
                metros={null}
                label="Publicar propiedad entera en el catálogo"
              />
            )}
          </Bloque>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#111827" }}>Habitaciones</div>
            {p.habitaciones.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0" }}>Sin habitaciones definidas.</p>}
            {p.habitaciones.map((h) => {
              const mediaHab = p.media.filter((m) => m.habitacion_id === h.id);
              return (
                <div key={h.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 100px 1.5fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                    <Field label="Habitación">
                      <input defaultValue={h.nombre} onBlur={(e) => e.target.value !== h.nombre && onActualizarHab(h.id, { nombre: e.target.value })} style={inputStyle} />
                    </Field>
                    <Field label="Precio (€)">
                      <input type="number" min={0} step="0.01" defaultValue={h.precio ?? ""} onBlur={(e) => onActualizarHab(h.id, { precio: e.target.value ? Number(e.target.value) : null })} style={inputStyle} />
                    </Field>
                    <Field label="Ocupada por">
                      <select defaultValue={h.cliente_id ?? ""} onChange={(e) => onActualizarHab(h.id, { cliente_id: e.target.value || null })} style={inputStyle}>
                        <option value="">Libre</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre} {c.apellidos ?? ""}</option>
                        ))}
                      </select>
                    </Field>
                    <button type="button" onClick={() => onEliminarHab(h.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 20, padding: 4, alignSelf: "center" }}>×</button>
                  </div>
                  <MediaGrid media={mediaHab} onDelete={onEliminarMedia} pequenio />
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
                      sugerencias={{ titulo: `${h.nombre} en ${p.nombre}`, precio: h.precio ?? 0, direccion: p.direccion ?? "", descripcion: p.notas ?? "" }}
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
