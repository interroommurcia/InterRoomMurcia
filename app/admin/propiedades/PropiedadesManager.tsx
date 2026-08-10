"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Cliente, FONT, FILTROS_INIT, Field, Filtros, Habitacion, NUEVA, Propiedad, filtrarPropiedades, inputStyle } from "./_components/shared";
import { PropiedadCard } from "./_components/PropiedadCard";
import { FiltroBar } from "./_components/FiltroBar";

export default function PropiedadesManager() {
  const [props, setProps] = useState<Propiedad[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nueva, setNueva] = useState(NUEVA);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INIT);
  const propsEnriquecidas = props.map((p) => ({
    ...p,
    asignado_nombre: p.asignado_a ? (usuarios.find((u) => u.id === p.asignado_a)?.nombre ?? null) : null,
  }));
  const propsFiltradas = filtrarPropiedades(propsEnriquecidas, filtros);

  type UsuarioRef = { id: string; nombre: string; rol: string };
  const [usuarios, setUsuarios] = useState<UsuarioRef[]>([]);

  async function cargar() {
    const [p, c, u] = await Promise.all([
      fetch("/api/admin/propiedades").then((r) => r.json()),
      fetch("/api/admin/clientes").then((r) => r.json()),
      fetch("/api/admin/usuarios").then((r) => r.json()).catch(() => []),
    ]);
    setProps(Array.isArray(p) ? p : []);
    setClientes(Array.isArray(c) ? c : []);
    const uArr = Array.isArray(u) ? u : [];
    setUsuarios(uArr);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

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

      <FiltroBar filtros={filtros} onChange={setFiltros} total={props.length} filtrado={propsFiltradas.length} />

      {mostrarForm && (
        <form onSubmit={crear} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Field label="Tipo">
              <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })} style={inputStyle}>
                <option value="piso">Piso</option>
                <option value="casa">Casa</option>
                <option value="estudio">Estudio</option>
                <option value="chalet">Chalet</option>
                <option value="venta_activo">Venta de Activo</option>
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
            <Field label={nueva.tipo === "venta_activo" ? "Precio de venta (€)" : "Precio total (€/mes)"}>
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

      {propsFiltradas.length === 0 ? (
        <p style={{ color: "#9ca3af", padding: 24, textAlign: "center" }}>
          {props.length === 0 ? "Aún no hay propiedades captadas." : "Ninguna propiedad coincide con los filtros."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {propsFiltradas.map((p) => (
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
