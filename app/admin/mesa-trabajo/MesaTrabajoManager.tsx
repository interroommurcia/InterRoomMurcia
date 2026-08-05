"use client";

import { useEffect, useMemo, useState } from "react";

type Tarea = {
  id: string;
  tipo: "tarea" | "cita" | "visita";
  titulo: string;
  fecha: string | null;
  hora: string | null;
  cliente_id: string | null;
  clienteNombre: string | null;
  asignado_a: string | null;
  trabajadorNombre: string | null;
  estado: "pendiente" | "hecha";
  notas: string | null;
};

type Cliente = { id: string; nombre: string; apellidos: string | null };
type Trabajador = { id: string; nombre: string; activo: boolean };

const TIPOS: { value: Tarea["tipo"]; label: string }[] = [
  { value: "tarea", label: "Tarea" },
  { value: "cita", label: "Cita" },
  { value: "visita", label: "Visita" },
];

const TIPO_COLOR: Record<Tarea["tipo"], string> = {
  tarea: "#6b7280",
  cita: "#b08d57",
  visita: "#2f855a",
};

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const NUEVA_TAREA = { tipo: "tarea" as Tarea["tipo"], titulo: "", fecha: "", hora: "", cliente_id: "", asignado_a: "", notas: "" };

export default function MesaTrabajoManager() {
  const hoy = useMemo(() => new Date(), []);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<"todas" | Tarea["tipo"]>("todas");
  const [filtroFecha, setFiltroFecha] = useState<string | null>(null);
  const [filtroTrabajador, setFiltroTrabajador] = useState<string>("");
  const [verHechas, setVerHechas] = useState(false);
  const [nueva, setNueva] = useState(NUEVA_TAREA);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cursor, setCursor] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [gestionTrabajadores, setGestionTrabajadores] = useState(false);
  const [nuevoTrabajador, setNuevoTrabajador] = useState("");

  async function cargar() {
    const [t, c, tr] = await Promise.all([
      fetch("/api/admin/mesa-trabajo").then((r) => r.json()),
      fetch("/api/admin/clientes").then((r) => r.json()),
      fetch("/api/admin/trabajadores").then((r) => r.json()),
    ]);
    setTareas(Array.isArray(t) ? t : []);
    setClientes(Array.isArray(c) ? c : []);
    setTrabajadores(Array.isArray(tr) ? tr : []);
    setLoading(false);
  }

  async function crearTrabajador(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nuevoTrabajador.trim();
    if (!nombre) return;
    await fetch("/api/admin/trabajadores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
    setNuevoTrabajador("");
    cargar();
  }

  async function eliminarTrabajador(id: string) {
    if (!confirm("¿Eliminar este trabajador? Las tareas asignadas quedarán sin asignar.")) return;
    await fetch(`/api/admin/trabajadores/${id}`, { method: "DELETE" });
    cargar();
  }

  async function reasignarTarea(id: string, asignado_a: string) {
    await fetch(`/api/admin/mesa-trabajo/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asignado_a }) });
    cargar();
  }

  useEffect(() => {
    cargar();
  }, []);

  const tareasPorDia = useMemo(() => {
    const mapa = new Map<string, Tarea[]>();
    for (const t of tareas) {
      if (!t.fecha) continue;
      const key = t.fecha.slice(0, 10);
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(t);
    }
    return mapa;
  }, [tareas]);

  const celdas = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const primerDia = new Date(year, month, 1);
    const offset = (primerDia.getDay() + 6) % 7;
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((offset + diasEnMes) / 7) * 7;
    const out: (Date | null)[] = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - offset + 1;
      out.push(dayNum >= 1 && dayNum <= diasEnMes ? new Date(year, month, dayNum) : null);
    }
    return out;
  }, [cursor]);

  function cambiarMes(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  function irHoy() {
    setCursor(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  }

  function seleccionarDia(iso: string) {
    if (filtroFecha === iso) {
      setFiltroFecha(null);
      return;
    }
    setFiltroFecha(iso);
    setNueva((n) => ({ ...n, fecha: iso }));
    setMostrarForm(true);
  }

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
        asignado_a: nueva.asignado_a || undefined,
        notas: nueva.notas || undefined,
      }),
    });
    setNueva({ ...NUEVA_TAREA, fecha: filtroFecha ?? "" });
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
    if (filtroFecha && (t.fecha?.slice(0, 10) ?? null) !== filtroFecha) return false;
    if (filtroTrabajador && t.asignado_a !== filtroTrabajador) return false;
    return true;
  });

  const isoHoy = isoDate(hoy);

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

      <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 340px", maxWidth: 420 }}>
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>
              {MESES[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn-ghost" onClick={() => cambiarMes(-1)}>‹</button>
              <button type="button" className="btn-ghost" onClick={irHoy}>Hoy</button>
              <button type="button" className="btn-ghost" onClick={() => cambiarMes(1)}>›</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 8 }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, opacity: 0.6, padding: "2px 0" }}>{d}</div>
            ))}
            {celdas.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDate(d);
              const items = tareasPorDia.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  onClick={() => seleccionarDia(iso)}
                  className="pisos-list-item"
                  style={{
                    minHeight: 40,
                    padding: 4,
                    cursor: "pointer",
                    border: iso === filtroFecha ? "2px solid var(--accent, #b08d57)" : undefined,
                    background: iso === isoHoy ? "rgba(176,141,87,0.08)" : undefined,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: iso === isoHoy ? 700 : 400 }}>{d.getDate()}</div>
                  {items.length > 0 && (
                    <div style={{ display: "flex", gap: 2, marginTop: 2, flexWrap: "wrap" }}>
                      {items.slice(0, 4).map((t) => (
                        <span
                          key={t.id}
                          title={t.titulo}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: TIPO_COLOR[t.tipo],
                            opacity: t.estado === "hecha" ? 0.4 : 1,
                            display: "inline-block",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="articulos-list-section" style={{ flex: "1 1 340px", marginTop: 0 }}>
          <div className="section-head">
            <h2>
              Pendientes ({filtradas.length})
              {filtroFecha && (
                <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>
                  {" "}· {new Date(filtroFecha).toLocaleDateString("es-ES")}{" "}
                  <button type="button" className="btn-ghost" style={{ padding: "2px 8px" }} onClick={() => setFiltroFecha(null)}>
                    quitar
                  </button>
                </span>
              )}
            </h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <select value={filtroTrabajador} onChange={(e) => setFiltroTrabajador(e.target.value)} style={{ padding: "4px 8px" }}>
                <option value="">Todos los trabajadores</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
              <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14 }}>
                <input type="checkbox" checked={verHechas} onChange={(e) => setVerHechas(e.target.checked)} />
                Ver hechas
              </label>
              <button type="button" className="btn-ghost" onClick={() => setGestionTrabajadores((v) => !v)}>
                {gestionTrabajadores ? "Cerrar equipo" : "Equipo"}
              </button>
              <button type="button" className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
                {mostrarForm ? "Cancelar" : "Nueva anotación"}
              </button>
            </div>
          </div>

          {gestionTrabajadores && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12, background: "#fafafa" }}>
              <form onSubmit={crearTrabajador} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={nuevoTrabajador} onChange={(e) => setNuevoTrabajador(e.target.value)} placeholder="Nombre del trabajador" style={{ flex: 1 }} />
                <button type="submit" className="btn-primary">Añadir</button>
              </form>
              {trabajadores.length === 0 ? (
                <p className="admin-empty" style={{ margin: 0 }}>Aún no hay trabajadores.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {trabajadores.map((t) => (
                    <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 999 }}>
                      <span>{t.nombre}</span>
                      <button type="button" onClick={() => eliminarTrabajador(t.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--orange)", fontSize: 14 }}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
                <label>
                  Asignar a
                  <select value={nueva.asignado_a} onChange={(e) => setNueva({ ...nueva, asignado_a: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {trabajadores.filter((t) => t.activo).map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
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
                    {t.trabajadorNombre && <span style={{ marginLeft: 6, padding: "1px 8px", borderRadius: 999, background: "var(--orange-light)", color: "var(--orange)", fontSize: 11 }}>👤 {t.trabajadorNombre}</span>}
                    {t.notas ? ` · ${t.notas}` : ""}
                  </div>
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px", flexWrap: "wrap" }}>
                  <select value={t.asignado_a ?? ""} onChange={(e) => reasignarTarea(t.id, e.target.value)} style={{ padding: "2px 6px", fontSize: 12 }}>
                    <option value="">Sin asignar</option>
                    {trabajadores.filter((tr) => tr.activo || tr.id === t.asignado_a).map((tr) => (
                      <option key={tr.id} value={tr.id}>{tr.nombre}</option>
                    ))}
                  </select>
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
    </div>
  );
}
