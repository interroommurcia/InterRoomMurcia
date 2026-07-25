"use client";

import { useEffect, useState } from "react";

type Tarea = {
  id: string;
  tipo: "tarea" | "cita" | "visita";
  titulo: string;
  fecha: string | null;
  hora: string | null;
  cliente_id: string | null;
  clienteNombre: string | null;
  estado: "pendiente" | "hecha";
  notas: string | null;
};

type Cliente = { id: string; nombre: string; apellidos: string | null };

const TIPOS: { value: Tarea["tipo"]; label: string }[] = [
  { value: "tarea", label: "Tarea" },
  { value: "cita", label: "Cita" },
  { value: "visita", label: "Visita" },
];

const NUEVA_TAREA = { tipo: "tarea" as Tarea["tipo"], titulo: "", fecha: "", hora: "", cliente_id: "", notas: "" };

export default function MesaTrabajoManager() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<"todas" | Tarea["tipo"]>("todas");
  const [verHechas, setVerHechas] = useState(false);
  const [nueva, setNueva] = useState(NUEVA_TAREA);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    const [t, c] = await Promise.all([
      fetch("/api/admin/mesa-trabajo").then((r) => r.json()),
      fetch("/api/admin/clientes").then((r) => r.json()),
    ]);
    setTareas(Array.isArray(t) ? t : []);
    setClientes(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crearTarea(e: React.FormEvent) {
    e.preventDefault();
    if (!nueva.titulo.trim()) return;
    await fetch("/api/admin/mesa-trabajo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: nueva.tipo,
        titulo: nueva.titulo,
        fecha: nueva.fecha || undefined,
        hora: nueva.hora || undefined,
        cliente_id: nueva.cliente_id || undefined,
        notas: nueva.notas || undefined,
      }),
    });
    setNueva(NUEVA_TAREA);
    setMostrarForm(false);
    cargar();
  }

  async function marcarEstado(id: string, estado: Tarea["estado"]) {
    await fetch(`/api/admin/mesa-trabajo/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    cargar();
  }

  async function eliminarTarea(id: string) {
    await fetch(`/api/admin/mesa-trabajo/${id}`, { method: "DELETE" });
    cargar();
  }

  const filtradas = tareas.filter((t) => {
    if (filtroTipo !== "todas" && t.tipo !== filtroTipo) return false;
    if (!verHechas && t.estado === "hecha") return false;
    return true;
  });

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      <div className="contabilidad-tabs">
        {(["todas", "tarea", "cita", "visita"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`contabilidad-tab${filtroTipo === f ? " active" : ""}`}
            onClick={() => setFiltroTipo(f)}
          >
            {f === "todas" ? "Todas" : TIPOS.find((t) => t.value === f)!.label + "s"}
          </button>
        ))}
      </div>

      <div className="articulos-list-section" style={{ marginTop: 20 }}>
        <div className="section-head">
          <h2>Pendientes ({filtradas.length})</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" checked={verHechas} onChange={(e) => setVerHechas(e.target.checked)} />
              Ver hechas
            </label>
            <button type="button" className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
              {mostrarForm ? "Cancelar" : "Nueva anotación"}
            </button>
          </div>
        </div>

        {mostrarForm && (
          <form className="piso-form" onSubmit={crearTarea}>
            <div className="lead-form-row">
              <label>
                Tipo
                <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value as Tarea["tipo"] })}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Título
                <input required value={nueva.titulo} onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} placeholder="Ej. Llamar a propietario, visita piso Guadalupe..." />
              </label>
            </div>
            <div className="lead-form-row">
              <label>
                Fecha
                <input type="date" value={nueva.fecha} onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })} />
              </label>
              <label>
                Hora
                <input type="time" value={nueva.hora} onChange={(e) => setNueva({ ...nueva, hora: e.target.value })} />
              </label>
              <label>
                Cliente vinculado
                <select value={nueva.cliente_id} onChange={(e) => setNueva({ ...nueva, cliente_id: e.target.value })}>
                  <option value="">Sin vincular</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Notas
              <input value={nueva.notas} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} />
            </label>
            <div className="lead-form-actions">
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        )}

        {filtradas.length === 0 ? (
          <p className="admin-empty">Nada por aquí.</p>
        ) : (
          filtradas.map((t) => (
            <div key={t.id} className="pisos-list-item">
              <div className="pisos-list-body">
                <h4>
                  <span className="editor-badge-hidden">{TIPOS.find((x) => x.value === t.tipo)!.label} · </span>
                  {t.titulo}
                </h4>
                <div className="loc">
                  {t.fecha ? new Date(t.fecha).toLocaleDateString("es-ES") : "sin fecha"}
                  {t.hora ? ` · ${t.hora.slice(0, 5)}` : ""} · {t.clienteNombre || "sin cliente"}
                  {t.notas ? ` · ${t.notas}` : ""}
                </div>
              </div>
              <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={t.estado === "hecha"}
                    onChange={(e) => marcarEstado(t.id, e.target.checked ? "hecha" : "pendiente")}
                  />
                  Hecha
                </label>
                <button type="button" className="btn-ghost" onClick={() => eliminarTarea(t.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
