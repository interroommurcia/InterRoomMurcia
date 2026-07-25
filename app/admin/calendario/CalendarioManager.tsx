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
  estado: "pendiente" | "hecha";
  notas: string | null;
};

type Cliente = { id: string; nombre: string; apellidos: string | null };

const TIPOS: { value: Tarea["tipo"]; label: string }[] = [
  { value: "tarea", label: "Tarea" },
  { value: "cita", label: "Cita" },
  { value: "visita", label: "Visita" },
];

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

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const NUEVA_TAREA = { tipo: "tarea" as Tarea["tipo"], titulo: "", hora: "", cliente_id: "", notas: "" };

const TIPO_COLOR: Record<Tarea["tipo"], string> = {
  tarea: "#6b7280",
  cita: "#b08d57",
  visita: "#2f855a",
};

export default function CalendarioManager() {
  const hoy = useMemo(() => new Date(), []);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [seleccionado, setSeleccionado] = useState(isoDate(hoy));
  const [vista, setVista] = useState<"mes" | "semana">("mes");
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

  function cambiarMes(delta: number) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  function irHoy() {
    setCursor(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setSeleccionado(isoDate(hoy));
  }

  function seleccionarDia(iso: string) {
    setSeleccionado(iso);
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
        fecha: seleccionado,
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

  const diasSemana = useMemo(() => {
    const base = parseIso(seleccionado);
    const offset = (base.getDay() + 6) % 7;
    const lunes = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
    return Array.from({ length: 7 }, (_, i) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
  }, [seleccionado]);

  const tareasDelDia = tareasPorDia.get(seleccionado) ?? [];
  const isoHoy = isoDate(hoy);

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      <div className="contabilidad-tabs">
        <button type="button" className={`contabilidad-tab${vista === "mes" ? " active" : ""}`} onClick={() => setVista("mes")}>
          Mes
        </button>
        <button type="button" className={`contabilidad-tab${vista === "semana" ? " active" : ""}`} onClick={() => setVista("semana")}>
          Semana
        </button>
      </div>

      {vista === "mes" && (
        <div style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>
              {MESES[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => cambiarMes(-1)}>‹ Mes anterior</button>
              <button type="button" className="btn-ghost" onClick={irHoy}>Hoy</button>
              <button type="button" className="btn-ghost" onClick={() => cambiarMes(1)}>Mes siguiente ›</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 12 }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, opacity: 0.7, padding: "4px 0" }}>{d}</div>
            ))}
            {celdas.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDate(d);
              const items = tareasPorDia.get(iso) ?? [];
              const visibles = items.slice(0, 3);
              const resto = items.length - visibles.length;
              return (
                <div
                  key={iso}
                  onClick={() => seleccionarDia(iso)}
                  className="pisos-list-item"
                  style={{
                    minHeight: 84,
                    padding: 8,
                    cursor: "pointer",
                    border: iso === seleccionado ? "2px solid var(--accent, #b08d57)" : undefined,
                    background: iso === isoHoy ? "rgba(176,141,87,0.08)" : undefined,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: iso === isoHoy ? 700 : 400 }}>{d.getDate()}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                    {visibles.map((t) => (
                      <div
                        key={t.id}
                        title={t.titulo}
                        style={{
                          fontSize: 10.5,
                          padding: "1px 5px",
                          borderRadius: 4,
                          color: "#fff",
                          background: TIPO_COLOR[t.tipo],
                          opacity: t.estado === "hecha" ? 0.5 : 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.hora ? `${t.hora.slice(0, 5)} ` : ""}{t.titulo}
                      </div>
                    ))}
                    {resto > 0 && <div style={{ fontSize: 10.5, opacity: 0.7 }}>+{resto} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vista === "semana" && (
        <div style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Semana del {diasSemana[0].getDate()} de {MESES[diasSemana[0].getMonth()]}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {diasSemana.map((d) => {
              const iso = isoDate(d);
              const items = tareasPorDia.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  onClick={() => seleccionarDia(iso)}
                  className="pisos-list-item"
                  style={{
                    minHeight: 100,
                    padding: 8,
                    cursor: "pointer",
                    border: iso === seleccionado ? "2px solid var(--accent, #b08d57)" : undefined,
                    background: iso === isoHoy ? "rgba(176,141,87,0.08)" : undefined,
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{DIAS_SEMANA[(d.getDay() + 6) % 7]} {d.getDate()}</div>
                  {items.map((t) => (
                    <div key={t.id} style={{ fontSize: 11, marginTop: 4, opacity: t.estado === "hecha" ? 0.5 : 1 }}>
                      {t.hora ? `${t.hora.slice(0, 5)} · ` : ""}{t.titulo}
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>—</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="articulos-list-section" style={{ marginTop: 24 }}>
        <div className="section-head">
          <h2>
            Agenda del {parseIso(seleccionado).getDate()} de {MESES[parseIso(seleccionado).getMonth()]} ({tareasDelDia.length})
          </h2>
          <button type="button" className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "Nueva anotación"}
          </button>
        </div>

        {mostrarForm && (
          <form className="piso-form" onSubmit={crearTarea}>
            <div className="lead-form-row">
              <label>
                Tipo
                <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value as Tarea["tipo"] })}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Título
                <input required value={nueva.titulo} onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} placeholder="Ej. Llamar a propietario, visita piso Guadalupe..." />
              </label>
              <label>
                Hora
                <input type="time" value={nueva.hora} onChange={(e) => setNueva({ ...nueva, hora: e.target.value })} />
              </label>
            </div>
            <div className="lead-form-row">
              <label style={{ flex: 1 }}>
                Cliente vinculado
                <select value={nueva.cliente_id} onChange={(e) => setNueva({ ...nueva, cliente_id: e.target.value })}>
                  <option value="">Sin vincular</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Notas
                <input value={nueva.notas} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} />
              </label>
            </div>
            <div className="lead-form-actions">
              <button type="submit" className="btn-primary">Guardar en {seleccionado}</button>
            </div>
          </form>
        )}

        {tareasDelDia.length === 0 ? (
          <p className="admin-empty">Nada anotado este día.</p>
        ) : (
          tareasDelDia.map((t) => (
            <div key={t.id} className="pisos-list-item">
              <div className="pisos-list-body">
                <h4>
                  <span className="editor-badge-hidden">{TIPOS.find((x) => x.value === t.tipo)!.label} · </span>
                  {t.titulo}
                </h4>
                <div className="loc">
                  {t.hora ? `${t.hora.slice(0, 5)} · ` : ""}{t.clienteNombre || "sin cliente"}
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
                <button type="button" className="btn-ghost" onClick={() => eliminarTarea(t.id)}>Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
