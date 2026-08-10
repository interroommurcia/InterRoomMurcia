"use client";

import { useEffect, useMemo, useState } from "react";
import { SITE_URL } from "../../../lib/site";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: "propietario" | "estudiante" | "comprador" | "creditos";
  tipo_secundario: "propietario" | "estudiante" | "comprador" | "creditos" | null;
  zona_interes: string | null;
  operacion: "alquiler" | "venta" | null;
  origen: "manual" | "lead" | "autocompletado";
  datos_completados: boolean;
  token: string;
  notas: string | null;
  created_at: string;
  habitacionAsignada?: boolean;
};

const PREFIJOS = [
  { code: "+34", label: "España (+34)" },
  { code: "+351", label: "Portugal (+351)" },
  { code: "+33", label: "Francia (+33)" },
  { code: "+39", label: "Italia (+39)" },
  { code: "+49", label: "Alemania (+49)" },
  { code: "+44", label: "Reino Unido (+44)" },
  { code: "+353", label: "Irlanda (+353)" },
  { code: "+31", label: "Países Bajos (+31)" },
  { code: "+32", label: "Bélgica (+32)" },
  { code: "+41", label: "Suiza (+41)" },
  { code: "+43", label: "Austria (+43)" },
  { code: "+48", label: "Polonia (+48)" },
  { code: "+40", label: "Rumanía (+40)" },
  { code: "+30", label: "Grecia (+30)" },
  { code: "+36", label: "Hungría (+36)" },
  { code: "+420", label: "Chequia (+420)" },
  { code: "+380", label: "Ucrania (+380)" },
  { code: "+7", label: "Rusia (+7)" },
  { code: "+212", label: "Marruecos (+212)" },
  { code: "+213", label: "Argelia (+213)" },
  { code: "+216", label: "Túnez (+216)" },
  { code: "+1", label: "EE.UU. / Canadá (+1)" },
  { code: "+52", label: "México (+52)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+58", label: "Venezuela (+58)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+55", label: "Brasil (+55)" },
  { code: "+56", label: "Chile (+56)" },
  { code: "+51", label: "Perú (+51)" },
  { code: "+593", label: "Ecuador (+593)" },
  { code: "+86", label: "China (+86)" },
  { code: "+91", label: "India (+91)" },
];

const TIPOS: { value: Cliente["tipo"]; label: string }[] = [
  { value: "propietario", label: "Propietario" },
  { value: "estudiante", label: "Estudiante" },
  { value: "comprador", label: "Comprador Finalista" },
  { value: "creditos", label: "Cliente de Créditos" },
];

function labelTipo(tipo: Cliente["tipo"]) {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

const NUEVO_CLIENTE = {
  nombre: "",
  apellidos: "",
  telefonoPrefijo: "+34",
  telefonoNumero: "",
  email: "",
  tipo: "propietario" as Cliente["tipo"],
  tipo_secundario: "" as "" | Cliente["tipo"],
  zona_interes: "",
  operacion: "alquiler" as NonNullable<Cliente["operacion"]>,
  notas: "",
};

export default function ClientesManager() {
  const [tab, setTab] = useState<Cliente["tipo"]>("propietario");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(NUEVO_CLIENTE);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<{ nombre: string; apellidos: string; telefonoPrefijo: string; telefonoNumero: string; email: string; tipo_secundario: "" | Cliente["tipo"]; notas: string }>({ nombre: "", apellidos: "", telefonoPrefijo: "+34", telefonoNumero: "", email: "", tipo_secundario: "", notas: "" });
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activo" | "inactivo">("todos");
  const [filtroAnio, setFiltroAnio] = useState<string>("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  async function cargar() {
    const data = await fetch("/api/admin/clientes").then((r) => r.json());
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const aniosDisponibles = useMemo(() => {
    const anios = new Set<number>();
    for (const c of clientes) {
      anios.add(new Date(c.created_at).getFullYear());
    }
    return Array.from(anios).sort((a, b) => b - a);
  }, [clientes]);

  function abrirFormulario() {
    setNuevoCliente({ ...NUEVO_CLIENTE, tipo: tab });
    setMostrarNuevoCliente((v) => !v);
  }

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoCliente.nombre.trim()) return;
    const telefono = nuevoCliente.telefonoNumero.trim() ? `${nuevoCliente.telefonoPrefijo} ${nuevoCliente.telefonoNumero.trim()}` : "";
    await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevoCliente.nombre,
        apellidos: nuevoCliente.apellidos,
        telefono,
        email: nuevoCliente.email,
        tipo: nuevoCliente.tipo,
        tipo_secundario: nuevoCliente.tipo_secundario || null,
        zona_interes: nuevoCliente.zona_interes,
        operacion: nuevoCliente.operacion,
        notas: nuevoCliente.notas || null,
      }),
    });
    setNuevoCliente({ ...NUEVO_CLIENTE, tipo: tab });
    setMostrarNuevoCliente(false);
    cargar();
  }

  async function eliminarCliente(id: string) {
    await fetch(`/api/admin/clientes/${id}`, { method: "DELETE" });
    cargar();
  }

  async function eliminarSeleccionados() {
    if (seleccionados.size === 0) return;
    if (!confirm(`¿Eliminar ${seleccionados.size} cliente(s)? Esta acción no se puede deshacer.`)) return;
    for (const id of seleccionados) {
      await fetch(`/api/admin/clientes/${id}`, { method: "DELETE" });
    }
    setSeleccionados(new Set());
    cargar();
  }

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodos(ids: string[]) {
    setSeleccionados((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }

  function abrirEdicion(c: Cliente) {
    if (editando === c.id) {
      setEditando(null);
      return;
    }
    setEditando(c.id);
    const tel = (c.telefono ?? "").trim();
    const m = tel.match(/^(\+\d{1,4})\s*(.*)$/);
    setEdicion({
      nombre: c.nombre ?? "",
      apellidos: c.apellidos ?? "",
      telefonoPrefijo: m?.[1] ?? "+34",
      telefonoNumero: m?.[2] ?? tel,
      email: c.email ?? "",
      tipo_secundario: c.tipo_secundario ?? "",
      notas: c.notas ?? "",
    });
  }

  async function guardarEdicion(id: string) {
    if (!confirm("¿Estás seguro de que quieres modificar los datos del contacto?")) return;
    const telefono = edicion.telefonoNumero.trim() ? `${edicion.telefonoPrefijo} ${edicion.telefonoNumero.trim()}` : null;
    await fetch(`/api/admin/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: edicion.nombre.trim(),
        apellidos: edicion.apellidos.trim() || null,
        telefono,
        email: edicion.email.trim() || null,
        tipo_secundario: edicion.tipo_secundario || null,
        notas: edicion.notas || null,
      }),
    });
    setEditando(null);
    cargar();
  }

  function exportarExcel() {
    const cols = ["Nombre", "Apellidos", "Teléfono", "Email", "Tipo", "Rol secundario", "Zona interés", "Operación", "Origen", "Datos completos", "Notas", "Alta"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = clientes.map((c) => [
      c.nombre, c.apellidos ?? "", c.telefono ?? "", c.email ?? "",
      labelTipo(c.tipo), c.tipo_secundario ? labelTipo(c.tipo_secundario) : "",
      c.zona_interes ?? "", c.operacion ?? "", c.origen,
      c.datos_completados ? "sí" : "no", c.notas ?? "",
      new Date(c.created_at).toLocaleDateString("es-ES"),
    ].map(escape).join(";"));
    const csv = "﻿" + [cols.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copiarEnlace(token: string) {
    const url = `${SITE_URL}/completar-datos/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(token);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  const isEstudianteTab = tab === "estudiante";

  const clientesDelTab = clientes.filter((c) => c.tipo === tab || c.tipo_secundario === tab);
  const clientesFiltrados = clientesDelTab.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (q) {
      const nombreCompleto = `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase();
      const qDigits = q.replace(/\D/g, "");
      const telefonoDigits = (c.telefono ?? "").replace(/\D/g, "");
      if (!(
        nombreCompleto.includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (qDigits.length > 0 && telefonoDigits.includes(qDigits))
      )) return false;
    }
    if (isEstudianteTab && filtroEstado !== "todos") {
      const activo = !!c.habitacionAsignada;
      if (filtroEstado === "activo" && !activo) return false;
      if (filtroEstado === "inactivo" && activo) return false;
    }
    if (filtroAnio) {
      const anio = new Date(c.created_at).getFullYear();
      if (anio !== Number(filtroAnio)) return false;
    }
    return true;
  });

  const countActivos = isEstudianteTab ? clientesDelTab.filter((c) => c.habitacionAsignada).length : 0;
  const countInactivos = isEstudianteTab ? clientesDelTab.filter((c) => !c.habitacionAsignada).length : 0;

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      <div className="contabilidad-tabs">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`contabilidad-tab${tab === t.value ? " active" : ""}`}
            onClick={() => {
              setTab(t.value);
              setMostrarNuevoCliente(false);
              setFiltroEstado("todos");
              setFiltroAnio("");
              setSeleccionados(new Set());
            }}
          >
            {t.label} ({clientes.filter((c) => c.tipo === t.value || c.tipo_secundario === t.value).length})
          </button>
        ))}
      </div>

      <div className="articulos-list-section" style={{ marginTop: 20 }}>
        <div className="section-head">
          <h2>
            {labelTipo(tab)} ({clientesFiltrados.length}/{clientesDelTab.length})
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={exportarExcel} disabled={clientes.length === 0}>
              Exportar Excel
            </button>
            <button type="button" className="btn-primary" onClick={abrirFormulario}>
              {mostrarNuevoCliente ? "Cancelar" : "Nuevo cliente"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: 1, minWidth: 200 }}>
            Buscar por nombre, email o móvil
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Pepe, pepe@mail.com o 612345678" />
          </label>
          {isEstudianteTab && (
            <label>
              Estado
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as "todos" | "activo" | "inactivo")} style={{ minWidth: 140 }}>
                <option value="todos">Todos ({clientesDelTab.length})</option>
                <option value="activo">Activos ({countActivos})</option>
                <option value="inactivo">Inactivos ({countInactivos})</option>
              </select>
            </label>
          )}
          <label>
            Año de alta
            <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} style={{ minWidth: 100 }}>
              <option value="">Todos</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        {seleccionados.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", marginBottom: 12, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, fontSize: 13 }}>
            <span>{seleccionados.size} seleccionado(s)</span>
            <button type="button" className="btn-ghost" style={{ color: "#ef4444", fontSize: 13 }} onClick={eliminarSeleccionados}>
              Eliminar seleccionados
            </button>
            <button type="button" className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setSeleccionados(new Set())}>
              Deseleccionar
            </button>
          </div>
        )}

        {mostrarNuevoCliente && (
          <form className="piso-form" onSubmit={crearCliente}>
            <div className="lead-form-row">
              <label>
                Nombre
                <input required value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
              </label>
              <label>
                Apellidos
                <input value={nuevoCliente.apellidos} onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })} />
              </label>
            </div>
            <div className="lead-form-row">
              <label>
                Prefijo
                <select value={nuevoCliente.telefonoPrefijo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefonoPrefijo: e.target.value })}>
                  {PREFIJOS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Teléfono
                <input value={nuevoCliente.telefonoNumero} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefonoNumero: e.target.value })} />
              </label>
              <label>
                Email
                <input type="email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
              </label>
            </div>
            <div className="lead-form-row">
              <label>
                Tipo
                <select value={nuevoCliente.tipo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo: e.target.value as Cliente["tipo"] })}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Zona de interés
                <input value={nuevoCliente.zona_interes} onChange={(e) => setNuevoCliente({ ...nuevoCliente, zona_interes: e.target.value })} />
              </label>
              <label>
                Operación
                <select value={nuevoCliente.operacion} onChange={(e) => setNuevoCliente({ ...nuevoCliente, operacion: e.target.value as NonNullable<Cliente["operacion"]> })}>
                  <option value="alquiler">Alquiler</option>
                  <option value="venta">Compraventa</option>
                </select>
              </label>
              <label>
                Rol secundario (opcional)
                <select value={nuevoCliente.tipo_secundario} onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo_secundario: e.target.value as "" | Cliente["tipo"] })}>
                  <option value="">— ninguno —</option>
                  {TIPOS.filter((t) => t.value !== nuevoCliente.tipo).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lead-form-row">
              <label style={{ flex: 1 }}>
                Notas
                <textarea rows={3} value={nuevoCliente.notas} onChange={(e) => setNuevoCliente({ ...nuevoCliente, notas: e.target.value })} placeholder="Observaciones internas sobre el cliente..." />
              </label>
            </div>
            <div className="lead-form-actions">
              <button type="submit" className="btn-primary">
                Guardar cliente
              </button>
            </div>
          </form>
        )}

        {clientesFiltrados.length === 0 ? (
          <p className="admin-empty">{clientesDelTab.length === 0 ? "Todavía no hay clientes en esta sección." : "Sin resultados para esa búsqueda."}</p>
        ) : (
          <>
            {isEstudianteTab && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer", opacity: 0.7 }}>
                  <input
                    type="checkbox"
                    checked={clientesFiltrados.length > 0 && clientesFiltrados.every((c) => seleccionados.has(c.id))}
                    onChange={() => seleccionarTodos(clientesFiltrados.map((c) => c.id))}
                  />
                  Seleccionar todos ({clientesFiltrados.length})
                </label>
              </div>
            )}
            {clientesFiltrados.map((cliente) => (
              <div key={cliente.id} style={{ display: "flex", flexDirection: "column", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 12, marginBottom: 12, background: "#fff" }}>
                <div className="pisos-list-item" style={{ marginBottom: 0, border: "none", borderRadius: 0 }}>
                  <div className="pisos-list-body">
                    <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isEstudianteTab && (
                        <input
                          type="checkbox"
                          checked={seleccionados.has(cliente.id)}
                          onChange={() => toggleSeleccion(cliente.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginRight: 2 }}
                        />
                      )}
                      {cliente.nombre} {cliente.apellidos}
                      {isEstudianteTab && (
                        <span style={{
                          fontSize: 11,
                          padding: "1px 8px",
                          borderRadius: 999,
                          background: cliente.habitacionAsignada ? "#d1fae5" : "#fee2e2",
                          color: cliente.habitacionAsignada ? "#065f46" : "#991b1b",
                          fontWeight: 500,
                        }}>
                          {cliente.habitacionAsignada ? "Activo" : "Inactivo"}
                        </span>
                      )}
                      {cliente.tipo_secundario && <span className="editor-badge-hidden"> · también {labelTipo(cliente.tipo_secundario)}</span>}
                      {!cliente.datos_completados && cliente.origen !== "manual" && <span className="editor-badge-hidden"> · pendiente de rellenar</span>}
                    </h4>
                    <div className="loc">
                      {cliente.telefono || "sin teléfono"} · {cliente.email || "sin email"} · {cliente.zona_interes || "sin zona"} · {cliente.operacion || "—"}
                      <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 12 }}>
                        Alta: {new Date(cliente.created_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {cliente.notas && <div className="loc" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{cliente.notas}</div>}
                  </div>
                  <div className="lead-form-actions" style={{ padding: "0 16px 12px", flexWrap: "wrap" }}>
                    <button type="button" className="btn-ghost" style={{ minHeight: 44 }} onClick={() => abrirEdicion(cliente)}>
                      {editando === cliente.id ? "Cerrar" : "Editar rol / notas"}
                    </button>
                    <button type="button" className="btn-ghost" style={{ minHeight: 44 }} onClick={() => copiarEnlace(cliente.token)}>
                      {copiado === cliente.token ? "Enlace copiado" : "Copiar enlace de autorrelleno"}
                    </button>
                    <button type="button" className="btn-ghost" style={{ minHeight: 44 }} onClick={() => eliminarCliente(cliente.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
                {editando === cliente.id && (
                  <div className="cliente-edit">
                    <div className="cliente-edit-header">
                      <div>
                        <span className="cliente-edit-eyebrow">Editando</span>
                        <h5>{cliente.nombre} {cliente.apellidos}</h5>
                      </div>
                      <button type="button" className="cliente-edit-close" onClick={() => setEditando(null)} aria-label="Cerrar">×</button>
                    </div>

                    <div className="cliente-edit-section">
                      <div className="cliente-edit-section-title">Datos personales</div>
                      <div className="cliente-edit-grid">
                        <label className="cliente-edit-field">
                          <span>Nombre</span>
                          <input value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} />
                        </label>
                        <label className="cliente-edit-field">
                          <span>Apellidos</span>
                          <input value={edicion.apellidos} onChange={(e) => setEdicion({ ...edicion, apellidos: e.target.value })} />
                        </label>
                      </div>
                    </div>

                    <div className="cliente-edit-section">
                      <div className="cliente-edit-section-title">Contacto</div>
                      <div className="cliente-edit-grid cliente-edit-grid-tel">
                        <label className="cliente-edit-field">
                          <span>Prefijo</span>
                          <select value={edicion.telefonoPrefijo} onChange={(e) => setEdicion({ ...edicion, telefonoPrefijo: e.target.value })}>
                            {PREFIJOS.map((p) => (
                              <option key={p.code} value={p.code}>{p.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="cliente-edit-field">
                          <span>Teléfono</span>
                          <input value={edicion.telefonoNumero} onChange={(e) => setEdicion({ ...edicion, telefonoNumero: e.target.value })} placeholder="612 34 56 78" />
                        </label>
                        <label className="cliente-edit-field">
                          <span>Email</span>
                          <input type="email" value={edicion.email} onChange={(e) => setEdicion({ ...edicion, email: e.target.value })} placeholder="cliente@email.com" />
                        </label>
                      </div>
                    </div>

                    <div className="cliente-edit-section">
                      <div className="cliente-edit-section-title">Clasificación</div>
                      <label className="cliente-edit-field">
                        <span>Rol secundario (opcional)</span>
                        <select value={edicion.tipo_secundario} onChange={(e) => setEdicion({ ...edicion, tipo_secundario: e.target.value as "" | Cliente["tipo"] })}>
                          <option value="">— ninguno —</option>
                          {TIPOS.filter((t) => t.value !== cliente.tipo).map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="cliente-edit-section">
                      <div className="cliente-edit-section-title">Notas internas</div>
                      <label className="cliente-edit-field">
                        <textarea rows={4} value={edicion.notas} onChange={(e) => setEdicion({ ...edicion, notas: e.target.value })} placeholder="Observaciones que solo verá el equipo…" />
                      </label>
                    </div>

                    <div className="cliente-edit-actions">
                      <button type="button" className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
                      <button type="button" className="btn-primary" onClick={() => guardarEdicion(cliente.id)}>Guardar cambios</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
