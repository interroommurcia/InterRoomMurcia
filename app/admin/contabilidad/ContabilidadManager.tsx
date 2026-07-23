"use client";

import { useEffect, useState } from "react";
import { SITE_URL } from "../../../lib/site";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  tipo: "propietario" | "estudiante" | "comprador";
  zona_interes: string | null;
  operacion: "alquiler" | "venta" | null;
  origen: "manual" | "lead" | "autocompletado";
  datos_completados: boolean;
  token: string;
  created_at: string;
};

type Ingreso = {
  id: string;
  mes: string;
  ingreso_bruto: number;
  comision_pct: number;
  comision_calculada: number;
};

type Operacion = {
  id: string;
  cliente_id: string;
  fecha_cierre: string;
  precio_venta: number;
  comision_pct: number;
  comision_calculada: number;
};

type Gasto = {
  id: string;
  concepto: string;
  importe: number;
  pagado: boolean;
};

type Balance = {
  comisionBrutaTotal: number;
  beneficioNetoTotal: number;
  alquileres: { comisionBruta: number };
  compraventas: { comisionBruta: number; gastos: number; neto: number };
};

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function fmt(n: number) {
  return EUR.format(n || 0);
}

const NUEVO_CLIENTE = { nombre: "", apellidos: "", telefono: "", tipo: "propietario" as Cliente["tipo"], zona_interes: "", operacion: "alquiler" as NonNullable<Cliente["operacion"]> };

export default function ContabilidadManager() {
  const [tab, setTab] = useState<"alquileres" | "compraventas">("alquileres");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [nuevoCliente, setNuevoCliente] = useState(NUEVO_CLIENTE);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);

  const [ingresos, setIngresos] = useState<Record<string, Ingreso[]>>({});
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null);
  const [nuevoIngreso, setNuevoIngreso] = useState({ mes: "", ingresoBruto: "" });

  const [gastos, setGastos] = useState<Record<string, Gasto[]>>({});
  const [operacionAbierta, setOperacionAbierta] = useState<string | null>(null);
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", importe: "" });

  const [nuevaOperacion, setNuevaOperacion] = useState({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
  const [mostrarNuevaOperacion, setMostrarNuevaOperacion] = useState(false);

  const [copiado, setCopiado] = useState<string | null>(null);

  async function cargarTodo() {
    const [c, o, b] = await Promise.all([
      fetch("/api/admin/clientes").then((r) => r.json()),
      fetch("/api/admin/operaciones").then((r) => r.json()),
      fetch("/api/admin/contabilidad/balance").then((r) => r.json()),
    ]);
    setClientes(Array.isArray(c) ? c : []);
    setOperaciones(Array.isArray(o) ? o : []);
    setBalance(b?.comisionBrutaTotal !== undefined ? b : null);
    setLoading(false);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoCliente.nombre.trim()) return;
    await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoCliente),
    });
    setNuevoCliente(NUEVO_CLIENTE);
    setMostrarNuevoCliente(false);
    cargarTodo();
  }

  async function eliminarCliente(id: string) {
    await fetch(`/api/admin/clientes/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function toggleCliente(cliente: Cliente) {
    const next = clienteAbierto === cliente.id ? null : cliente.id;
    setClienteAbierto(next);
    if (next && !ingresos[cliente.id]) {
      const data = await fetch(`/api/admin/clientes/${cliente.id}/ingresos`).then((r) => r.json());
      setIngresos((prev) => ({ ...prev, [cliente.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function añadirIngreso(clienteId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoIngreso.mes || !nuevoIngreso.ingresoBruto) return;
    await fetch(`/api/admin/clientes/${clienteId}/ingresos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mes: `${nuevoIngreso.mes}-01`, ingresoBruto: Number(nuevoIngreso.ingresoBruto) }),
    });
    setNuevoIngreso({ mes: "", ingresoBruto: "" });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function eliminarIngreso(clienteId: string, ingresoId: string) {
    await fetch(`/api/admin/ingresos/${ingresoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function crearOperacion(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOperacion.cliente_id || !nuevaOperacion.fecha_cierre || !nuevaOperacion.precio_venta) return;
    await fetch("/api/admin/operaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaOperacion.cliente_id,
        fecha_cierre: nuevaOperacion.fecha_cierre,
        precio_venta: Number(nuevaOperacion.precio_venta),
        comision_pct: Number(nuevaOperacion.comision_pct),
      }),
    });
    setNuevaOperacion({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
    setMostrarNuevaOperacion(false);
    cargarTodo();
  }

  async function eliminarOperacion(id: string) {
    await fetch(`/api/admin/operaciones/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function toggleOperacion(operacion: Operacion) {
    const next = operacionAbierta === operacion.id ? null : operacion.id;
    setOperacionAbierta(next);
    if (next && !gastos[operacion.id]) {
      const data = await fetch(`/api/admin/operaciones/${operacion.id}/gastos`).then((r) => r.json());
      setGastos((prev) => ({ ...prev, [operacion.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function añadirGasto(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.importe) return;
    await fetch(`/api/admin/operaciones/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGasto.concepto, importe: Number(nuevoGasto.importe) }),
    });
    setNuevoGasto({ concepto: "", importe: "" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleGastoPagado(operacionId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function eliminarGasto(operacionId: string, gastoId: string) {
    await fetch(`/api/admin/gastos/${gastoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/gastos`).then((r) => r.json());
    setGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  function copiarEnlace(token: string) {
    const url = `${SITE_URL}/completar-datos/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(token);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  const clienteNombre = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombre} ${c.apellidos ?? ""}`.trim() : "—";
  };

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      {balance && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Comisión bruta total</h3>
            <div className="analytics-stat-value">{fmt(balance.comisionBrutaTotal)}</div>
            <p>Alquileres {fmt(balance.alquileres.comisionBruta)} · Compraventas {fmt(balance.compraventas.comisionBruta)}</p>
          </div>
          <div className="analytics-card">
            <h3>Beneficio neto total</h3>
            <div className="analytics-stat-value">{fmt(balance.beneficioNetoTotal)}</div>
            <p>Compraventas netas {fmt(balance.compraventas.neto)} (gastos {fmt(balance.compraventas.gastos)})</p>
          </div>
        </div>
      )}

      <div className="contabilidad-tabs">
        <button type="button" className={`contabilidad-tab${tab === "alquileres" ? " active" : ""}`} onClick={() => setTab("alquileres")}>
          Alquileres
        </button>
        <button type="button" className={`contabilidad-tab${tab === "compraventas" ? " active" : ""}`} onClick={() => setTab("compraventas")}>
          Compraventas
        </button>
      </div>

      {tab === "alquileres" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Clientes ({clientes.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevoCliente((v) => !v)}>
              {mostrarNuevoCliente ? "Cancelar" : "Nuevo cliente"}
            </button>
          </div>

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
                  Teléfono
                  <input value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
                </label>
                <label>
                  Tipo
                  <select value={nuevoCliente.tipo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo: e.target.value as Cliente["tipo"] })}>
                    <option value="propietario">Propietario</option>
                    <option value="estudiante">Estudiante / inquilino</option>
                    <option value="comprador">Comprador</option>
                  </select>
                </label>
              </div>
              <div className="lead-form-row">
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
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar cliente</button>
              </div>
            </form>
          )}

          {clientes.length === 0 ? (
            <p className="admin-empty">Todavía no hay clientes.</p>
          ) : (
            clientes.map((cliente) => (
              <div key={cliente.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleCliente(cliente)} style={{ cursor: "pointer" }}>
                  <h4>
                    {cliente.nombre} {cliente.apellidos}
                    <span className="editor-badge-hidden"> · {cliente.tipo}</span>
                    {!cliente.datos_completados && cliente.origen !== "manual" && <span className="editor-badge-hidden"> · pendiente de rellenar</span>}
                  </h4>
                  <div className="loc">
                    {cliente.telefono || "sin teléfono"} · {cliente.zona_interes || "sin zona"} · {cliente.operacion || "—"}
                  </div>
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="btn-ghost" onClick={() => copiarEnlace(cliente.token)}>
                    {copiado === cliente.token ? "Enlace copiado" : "Copiar enlace de autorrelleno"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => eliminarCliente(cliente.id)}>
                    Eliminar
                  </button>
                </div>

                {clienteAbierto === cliente.id && cliente.tipo === "propietario" && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirIngreso(cliente.id, e)}>
                      <label>
                        Mes
                        <input type="month" required value={nuevoIngreso.mes} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, mes: e.target.value })} />
                      </label>
                      <label>
                        Ingreso bruto (€)
                        <input type="number" min={0} required value={nuevoIngreso.ingresoBruto} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, ingresoBruto: e.target.value })} />
                      </label>
                      <button type="submit" className="btn-primary">Añadir mes</button>
                    </form>
                    {(ingresos[cliente.id] ?? []).map((ing) => (
                      <div key={ing.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>{ing.mes.slice(0, 7)} — ingreso {fmt(ing.ingreso_bruto)}, comisión {fmt(ing.comision_calculada)}</span>
                        <button type="button" className="btn-ghost" onClick={() => eliminarIngreso(cliente.id, ing.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(ingresos[cliente.id] ?? []).length === 0 && <p className="admin-empty">Sin meses registrados todavía.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "compraventas" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Operaciones ({operaciones.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevaOperacion((v) => !v)}>
              {mostrarNuevaOperacion ? "Cancelar" : "Nueva operación"}
            </button>
          </div>

          {mostrarNuevaOperacion && (
            <form className="piso-form" onSubmit={crearOperacion}>
              <label>
                Cliente
                <select required value={nuevaOperacion.cliente_id} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos} ({c.tipo})
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Fecha de cierre
                  <input type="date" required value={nuevaOperacion.fecha_cierre} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, fecha_cierre: e.target.value })} />
                </label>
                <label>
                  Precio de venta (€)
                  <input type="number" min={0} required value={nuevaOperacion.precio_venta} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, precio_venta: e.target.value })} />
                </label>
                <label>
                  % Comisión
                  <input type="number" min={0} step="0.1" value={nuevaOperacion.comision_pct} onChange={(e) => setNuevaOperacion({ ...nuevaOperacion, comision_pct: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar operación</button>
              </div>
            </form>
          )}

          {operaciones.length === 0 ? (
            <p className="admin-empty">Todavía no hay operaciones de compraventa.</p>
          ) : (
            operaciones.map((op) => (
              <div key={op.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleOperacion(op)} style={{ cursor: "pointer" }}>
                  <h4>{clienteNombre(op.cliente_id)}</h4>
                  <div className="loc">
                    Cierre {new Date(op.fecha_cierre).toLocaleDateString("es-ES")} · Venta {fmt(op.precio_venta)} · Comisión {fmt(op.comision_calculada)}
                  </div>
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="btn-ghost" onClick={() => eliminarOperacion(op.id)}>
                    Eliminar operación
                  </button>
                </div>

                {operacionAbierta === op.id && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirGasto(op.id, e)}>
                      <label>
                        Concepto
                        <input required value={nuevoGasto.concepto} onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })} placeholder="Certificado energético, reforma..." />
                      </label>
                      <label>
                        Importe (€)
                        <input type="number" min={0} required value={nuevoGasto.importe} onChange={(e) => setNuevoGasto({ ...nuevoGasto, importe: e.target.value })} />
                      </label>
                      <button type="submit" className="btn-primary">Añadir gasto</button>
                    </form>
                    {(gastos[op.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {fmt(g.importe)}</span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoPagado(op.id, g.id, e.target.checked)} />
                            Pagado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGasto(op.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(gastos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin gastos registrados todavía.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
