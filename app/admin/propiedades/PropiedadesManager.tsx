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
type Media = { id: string; tipo: "foto" | "video"; url: string };
type Propiedad = {
  id: string;
  tipo: string;
  nombre: string;
  direccion: string | null;
  num_habitaciones: number;
  num_banos: number;
  precio_total: number | null;
  notas: string | null;
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
};

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

  async function subirArchivo(propId: string, file: File, tipo: "foto" | "video") {
    setSubiendo(propId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);
    await fetch(`/api/admin/propiedades/${propId}/media`, { method: "POST", body: fd });
    setSubiendo(null);
    cargar();
  }

  async function eliminarMedia(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await fetch(`/api/admin/propiedades/media/${id}`, { method: "DELETE" });
    cargar();
  }

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      <div className="section-head">
        <h2 style={{ fontSize: 16 }}>{props.length} propiedad{props.length === 1 ? "" : "es"}</h2>
        <button type="button" className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cancelar" : "Nueva propiedad"}
        </button>
      </div>

      {mostrarForm && (
        <form className="piso-form" onSubmit={crear}>
          <div className="lead-form-row">
            <label>
              Tipo
              <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}>
                <option value="piso">Piso</option>
                <option value="casa">Casa</option>
                <option value="estudio">Estudio</option>
                <option value="chalet">Chalet</option>
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Nombre
              <input required value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Ej. Piso Guadalupe 3B" />
            </label>
            <label style={{ flex: 1 }}>
              Dirección
              <input value={nueva.direccion ?? ""} onChange={(e) => setNueva({ ...nueva, direccion: e.target.value })} />
            </label>
          </div>
          <div className="lead-form-row">
            <label>
              Habitaciones
              <input type="number" min={0} value={nueva.num_habitaciones} onChange={(e) => setNueva({ ...nueva, num_habitaciones: Number(e.target.value) })} />
            </label>
            <label>
              Baños
              <input type="number" min={0} value={nueva.num_banos} onChange={(e) => setNueva({ ...nueva, num_banos: Number(e.target.value) })} />
            </label>
            <label>
              Precio total (€)
              <input type="number" min={0} step="0.01" value={nueva.precio_total ?? ""} onChange={(e) => setNueva({ ...nueva, precio_total: e.target.value ? Number(e.target.value) : null })} />
            </label>
          </div>
          <label>
            Notas
            <textarea value={nueva.notas ?? ""} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} rows={4} style={{ resize: "vertical", minHeight: 80, fontFamily: "inherit", width: "100%", padding: 8 }} />
          </label>
          <div className="lead-form-actions">
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      )}

      {props.length === 0 ? (
        <p className="admin-empty">Aún no hay propiedades captadas.</p>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", marginTop: 16 }}>
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
              onSubir={(f, t) => subirArchivo(p.id, f, t)}
              onEliminarMedia={eliminarMedia}
              subiendo={subiendo === p.id}
            />
          ))}
        </div>
      )}
    </div>
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
  subiendo,
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
  onSubir: (file: File, tipo: "foto" | "video") => void;
  onEliminarMedia: (id: string) => void;
  subiendo: boolean;
}) {
  const [nuevaHab, setNuevaHab] = useState("");
  const portada = p.media.find((m) => m.tipo === "foto");
  return (
    <div className="pisos-list-item" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", height: 180, background: "#f3f4f6", cursor: "pointer" }} onClick={onToggle}>
        {portada ? (
          <img src={portada.url} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontSize: 13 }}>Sin foto</div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEliminar(); }}
          title="Eliminar propiedad"
          style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 999, width: 28, height: 28, cursor: "pointer", color: "var(--orange)" }}
        >×</button>
      </div>
      <div style={{ padding: 12 }}>
        <h4 style={{ margin: 0, cursor: "pointer" }} onClick={onToggle}>{p.nombre}</h4>
        <div className="loc" style={{ fontSize: 12, opacity: 0.7 }}>
          {p.tipo} · {p.num_habitaciones} hab · {p.num_banos} baños
          {p.precio_total ? ` · ${p.precio_total}€` : ""}
        </div>
        {p.direccion && <div style={{ fontSize: 12, opacity: 0.6 }}>{p.direccion}</div>}
      </div>

      {abierta && (
        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", background: "#fafafa" }}>
          <div className="lead-form-row">
            <label>
              Nombre
              <input defaultValue={p.nombre} onBlur={(e) => e.target.value !== p.nombre && onActualizar({ nombre: e.target.value })} />
            </label>
            <label>
              Dirección
              <input defaultValue={p.direccion ?? ""} onBlur={(e) => e.target.value !== (p.direccion ?? "") && onActualizar({ direccion: e.target.value })} />
            </label>
          </div>
          <div className="lead-form-row">
            <label>
              Habitaciones
              <input type="number" min={0} defaultValue={p.num_habitaciones} onBlur={(e) => Number(e.target.value) !== p.num_habitaciones && onActualizar({ num_habitaciones: Number(e.target.value) })} />
            </label>
            <label>
              Baños
              <input type="number" min={0} defaultValue={p.num_banos} onBlur={(e) => Number(e.target.value) !== p.num_banos && onActualizar({ num_banos: Number(e.target.value) })} />
            </label>
            <label>
              Precio total (€)
              <input type="number" min={0} step="0.01" defaultValue={p.precio_total ?? ""} onBlur={(e) => onActualizar({ precio_total: e.target.value ? Number(e.target.value) : null })} />
            </label>
          </div>
          <label>
            Notas
            <textarea defaultValue={p.notas ?? ""} rows={3} style={{ resize: "vertical", minHeight: 60, width: "100%", padding: 8, fontFamily: "inherit" }} onBlur={(e) => onActualizar({ notas: e.target.value })} />
          </label>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Habitaciones y precios</div>
            {p.habitaciones.length === 0 && <p className="admin-empty" style={{ margin: "4px 0" }}>Sin habitaciones definidas.</p>}
            {p.habitaciones.map((h) => (
              <div key={h.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                <input defaultValue={h.nombre} onBlur={(e) => e.target.value !== h.nombre && onActualizarHab(h.id, { nombre: e.target.value })} style={{ flex: "1 1 100px", minWidth: 80 }} />
                <input type="number" min={0} step="0.01" defaultValue={h.precio ?? ""} placeholder="€" onBlur={(e) => onActualizarHab(h.id, { precio: e.target.value ? Number(e.target.value) : null })} style={{ width: 80 }} />
                <select defaultValue={h.cliente_id ?? ""} onChange={(e) => onActualizarHab(h.id, { cliente_id: e.target.value || null })} style={{ flex: "1 1 120px" }}>
                  <option value="">Sin ocupar</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellidos ?? ""}</option>
                  ))}
                </select>
                <button type="button" onClick={() => onEliminarHab(h.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--orange)", fontSize: 16 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={nuevaHab} onChange={(e) => setNuevaHab(e.target.value)} placeholder="Nueva habitación (ej. Master, H1)" style={{ flex: 1 }} />
              <button type="button" className="btn-ghost" onClick={() => { onCrearHab(nuevaHab); setNuevaHab(""); }}>Añadir</button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Fotos y vídeos</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {p.media.map((m) => (
                <div key={m.id} style={{ position: "relative", width: 88, height: 88 }}>
                  {m.tipo === "foto" ? (
                    <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
                  ) : (
                    <video src={m.url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, background: "#000" }} muted />
                  )}
                  <button
                    type="button"
                    onClick={() => onEliminarMedia(m.id)}
                    style={{ position: "absolute", top: 2, right: 2, background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 999, width: 20, height: 20, cursor: "pointer", color: "var(--orange)", fontSize: 12 }}
                  >×</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className="btn-ghost" style={{ cursor: "pointer" }}>
                {subiendo ? "Subiendo..." : "+ Foto"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onSubir(e.target.files[0], "foto")} disabled={subiendo} />
              </label>
              <label className="btn-ghost" style={{ cursor: "pointer" }}>
                {subiendo ? "Subiendo..." : "+ Vídeo"}
                <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onSubir(e.target.files[0], "video")} disabled={subiendo} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
