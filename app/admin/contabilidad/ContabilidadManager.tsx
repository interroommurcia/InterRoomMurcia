"use client";

import { useEffect, useState } from "react";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: "propietario" | "estudiante" | "comprador" | "creditos";
  zona_interes: string | null;
  operacion: "alquiler" | "venta" | null;
  origen: "manual" | "lead" | "autocompletado";
  datos_completados: boolean;
  token: string;
  mensualidad: number;
  comision_pct_alquiler: number;
  tieneIngresos: boolean;
  created_at: string;
};

type Credito = {
  id: string;
  cliente_id: string;
  fecha: string;
  precio: number;
};

type Ingreso = {
  id: string;
  mes: string;
  ingreso_bruto: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado: boolean;
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
  es_negativo: boolean;
  pagado: boolean;
};

function netoDeOperacion(comisionCalculada: number, gastos: Gasto[]) {
  return comisionCalculada + gastos.filter((g) => g.pagado).reduce((s, g) => s + (g.es_negativo ? -g.importe : g.importe), 0);
}

type Documento = {
  id: string;
  nombre: string;
  created_at: string;
};

type Balance = {
  comisionBrutaTotal: number;
  beneficioNetoTotal: number;
  alquileres: { comisionBruta: number };
  compraventas: { comisionBruta: number; gastos: number; neto: number };
  creditos: { bruto: number; neto: number };
};

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function fmt(n: number) {
  return EUR.format(n || 0);
}

const ACTIVAR_ALQUILER = { cliente_id: "", mensualidad: "", comision_pct: "15" };

function añoActual(mes: string) {
  return new Date(mes).getUTCFullYear();
}

export default function ContabilidadManager() {
  const [tab, setTab] = useState<"creditos" | "alquileres" | "compraventas">("creditos");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [nuevaOperacionCredito, setNuevaOperacionCredito] = useState({ cliente_id: "", fecha: "", precio: "" });
  const [mostrarNuevaOperacionCredito, setMostrarNuevaOperacionCredito] = useState(false);
  const [creditoGastos, setCreditoGastos] = useState<Record<string, Gasto[]>>({});
  const [creditoDocumentos, setCreditoDocumentos] = useState<Record<string, Documento[]>>({});
  const [creditoAbierto, setCreditoAbierto] = useState<string | null>(null);
  const [nuevoGastoCredito, setNuevoGastoCredito] = useState({ concepto: "", importe: "", esNegativo: true });
  const [subiendoDocumentoCredito, setSubiendoDocumentoCredito] = useState(false);

  const [activarAlquiler, setActivarAlquiler] = useState(ACTIVAR_ALQUILER);
  const [mostrarActivarAlquiler, setMostrarActivarAlquiler] = useState(false);

  const [ingresos, setIngresos] = useState<Record<string, Ingreso[]>>({});
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null);
  const [nuevoIngreso, setNuevoIngreso] = useState({ mes: "", ingresoBruto: "" });
  const [mostrarAjusteManual, setMostrarAjusteManual] = useState(false);
  const [mensualidadInput, setMensualidadInput] = useState("");

  const [gastos, setGastos] = useState<Record<string, Gasto[]>>({});
  const [operacionAbierta, setOperacionAbierta] = useState<string | null>(null);
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", importe: "", esNegativo: true });

  const [documentos, setDocumentos] = useState<Record<string, Documento[]>>({});
  const [subiendoDocumento, setSubiendoDocumento] = useState(false);

  const [nuevaOperacion, setNuevaOperacion] = useState({ cliente_id: "", fecha_cierre: "", precio_venta: "", comision_pct: "3" });
  const [mostrarNuevaOperacion, setMostrarNuevaOperacion] = useState(false);

  async function cargarTodo() {
    const [c, o, cr, b] = await Promise.all([
      fetch("/api/admin/clientes").then((r) => r.json()),
      fetch("/api/admin/operaciones").then((r) => r.json()),
      fetch("/api/admin/creditos").then((r) => r.json()),
      fetch("/api/admin/contabilidad/balance").then((r) => r.json()),
    ]);
    setClientes(Array.isArray(c) ? c : []);
    setOperaciones(Array.isArray(o) ? o : []);
    setCreditos(Array.isArray(cr) ? cr : []);
    setBalance(b?.comisionBrutaTotal !== undefined ? b : null);
    setLoading(false);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  async function crearOperacionCredito(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOperacionCredito.cliente_id || !nuevaOperacionCredito.fecha || !nuevaOperacionCredito.precio) return;
    await fetch("/api/admin/creditos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: nuevaOperacionCredito.cliente_id,
        fecha: nuevaOperacionCredito.fecha,
        precio: Number(nuevaOperacionCredito.precio),
      }),
    });
    setNuevaOperacionCredito({ cliente_id: "", fecha: "", precio: "" });
    setMostrarNuevaOperacionCredito(false);
    cargarTodo();
  }

  async function eliminarOperacionCredito(id: string) {
    await fetch(`/api/admin/creditos/${id}`, { method: "DELETE" });
    cargarTodo();
  }

  async function toggleCredito(credito: Credito) {
    const next = creditoAbierto === credito.id ? null : credito.id;
    setCreditoAbierto(next);
    if (next && !creditoGastos[credito.id]) {
      const data = await fetch(`/api/admin/creditos/${credito.id}/gastos`).then((r) => r.json());
      setCreditoGastos((prev) => ({ ...prev, [credito.id]: Array.isArray(data) ? data : [] }));
    }
    if (next && !creditoDocumentos[credito.id]) {
      const data = await fetch(`/api/admin/creditos/${credito.id}/documentos`).then((r) => r.json());
      setCreditoDocumentos((prev) => ({ ...prev, [credito.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function añadirGastoCredito(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGastoCredito.concepto || !nuevoGastoCredito.importe) return;
    await fetch(`/api/admin/creditos/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGastoCredito.concepto, importe: Number(nuevoGastoCredito.importe), es_negativo: nuevoGastoCredito.esNegativo }),
    });
    setNuevoGastoCredito({ concepto: "", importe: "", esNegativo: true });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleGastoCreditoPagado(operacionId: string, gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/credito-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado }),
    });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function eliminarGastoCredito(operacionId: string, gastoId: string) {
    await fetch(`/api/admin/credito-gastos/${gastoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/gastos`).then((r) => r.json());
    setCreditoGastos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function subirDocumentoCredito(operacionId: string, file: File) {
    setSubiendoDocumentoCredito(true);
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/admin/creditos/${operacionId}/documentos`, { method: "POST", body: form });
    const data = await fetch(`/api/admin/creditos/${operacionId}/documentos`).then((r) => r.json());
    setCreditoDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    setSubiendoDocumentoCredito(false);
  }

  async function eliminarDocumentoCredito(operacionId: string, documentoId: string) {
    await fetch(`/api/admin/credito-documentos/${documentoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/creditos/${operacionId}/documentos`).then((r) => r.json());
    setCreditoDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function activarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!activarAlquiler.cliente_id || !activarAlquiler.mensualidad) return;
    await fetch(`/api/admin/clientes/${activarAlquiler.cliente_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensualidad: Number(activarAlquiler.mensualidad) || 0,
        comision_pct_alquiler: Number(activarAlquiler.comision_pct) || 15,
      }),
    });
    setActivarAlquiler(ACTIVAR_ALQUILER);
    setMostrarActivarAlquiler(false);
    cargarTodo();
  }

  async function toggleCliente(cliente: Cliente) {
    const next = clienteAbierto === cliente.id ? null : cliente.id;
    setClienteAbierto(next);
    setMostrarAjusteManual(false);
    if (next) {
      setMensualidadInput(String(cliente.mensualidad ?? 0));
      const data = await fetch(`/api/admin/clientes/${cliente.id}/ingresos`).then((r) => r.json());
      setIngresos((prev) => ({ ...prev, [cliente.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function actualizarMensualidad(clienteId: string) {
    await fetch(`/api/admin/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensualidad: Number(mensualidadInput) || 0 }),
    });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
    cargarTodo();
  }

  async function toggleIngresoCobrado(clienteId: string, ingresoId: string, cobrado: boolean) {
    await fetch(`/api/admin/ingresos/${ingresoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cobrado }),
    });
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos((prev) => ({ ...prev, [clienteId]: Array.isArray(data) ? data : [] }));
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
    if (next && !documentos[operacion.id]) {
      const data = await fetch(`/api/admin/operaciones/${operacion.id}/documentos`).then((r) => r.json());
      setDocumentos((prev) => ({ ...prev, [operacion.id]: Array.isArray(data) ? data : [] }));
    }
  }

  async function subirDocumento(operacionId: string, file: File) {
    setSubiendoDocumento(true);
    const form = new FormData();
    form.append("file", file);
    await fetch(`/api/admin/operaciones/${operacionId}/documentos`, { method: "POST", body: form });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/documentos`).then((r) => r.json());
    setDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
    setSubiendoDocumento(false);
  }

  async function eliminarDocumento(operacionId: string, documentoId: string) {
    await fetch(`/api/admin/documentos/${documentoId}`, { method: "DELETE" });
    const data = await fetch(`/api/admin/operaciones/${operacionId}/documentos`).then((r) => r.json());
    setDocumentos((prev) => ({ ...prev, [operacionId]: Array.isArray(data) ? data : [] }));
  }

  async function añadirGasto(operacionId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoGasto.concepto || !nuevoGasto.importe) return;
    await fetch(`/api/admin/operaciones/${operacionId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepto: nuevoGasto.concepto, importe: Number(nuevoGasto.importe), es_negativo: nuevoGasto.esNegativo }),
    });
    setNuevoGasto({ concepto: "", importe: "", esNegativo: true });
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

  const clienteNombre = (id: string) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombre} ${c.apellidos ?? ""}`.trim() : "—";
  };

  const clientesConAlquiler = clientes.filter((c) => c.tipo === "propietario" && (c.mensualidad > 0 || c.tieneIngresos));
  const propietariosInactivos = clientes.filter((c) => c.tipo === "propietario" && !(c.mensualidad > 0 || c.tieneIngresos));

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      {balance && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Comisión bruta total</h3>
            <div className="analytics-stat-value">{fmt(balance.comisionBrutaTotal)}</div>
            <p>Alquileres {fmt(balance.alquileres.comisionBruta)} · Compraventas {fmt(balance.compraventas.comisionBruta)} · Créditos {fmt(balance.creditos.bruto)}</p>
          </div>
          <div className="analytics-card">
            <h3>Beneficio neto total</h3>
            <div className="analytics-stat-value">{fmt(balance.beneficioNetoTotal)}</div>
            <p>Compraventas netas {fmt(balance.compraventas.neto)} (gastos {fmt(balance.compraventas.gastos)}) · Créditos netos {fmt(balance.creditos.neto)}</p>
          </div>
        </div>
      )}

      <div className="contabilidad-tabs">
        <button type="button" className={`contabilidad-tab${tab === "creditos" ? " active" : ""}`} onClick={() => setTab("creditos")}>
          Compra de Créditos
        </button>
        <button type="button" className={`contabilidad-tab${tab === "alquileres" ? " active" : ""}`} onClick={() => setTab("alquileres")}>
          Alquileres
        </button>
        <button type="button" className={`contabilidad-tab${tab === "compraventas" ? " active" : ""}`} onClick={() => setTab("compraventas")}>
          Compraventas
        </button>
      </div>

      {tab === "creditos" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Operaciones de créditos ({creditos.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevaOperacionCredito((v) => !v)}>
              {mostrarNuevaOperacionCredito ? "Cancelar" : "Nueva operación"}
            </button>
          </div>

          {mostrarNuevaOperacionCredito && (
            <form className="piso-form" onSubmit={crearOperacionCredito}>
              <label>
                Cliente
                <select required value={nuevaOperacionCredito.cliente_id} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, cliente_id: e.target.value })}>
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
                  Fecha
                  <input type="date" required value={nuevaOperacionCredito.fecha} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, fecha: e.target.value })} />
                </label>
                <label>
                  Precio (€)
                  <input type="number" min={0} required value={nuevaOperacionCredito.precio} onChange={(e) => setNuevaOperacionCredito({ ...nuevaOperacionCredito, precio: e.target.value })} />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar operación</button>
              </div>
            </form>
          )}

          {creditos.length === 0 ? (
            <p className="admin-empty">Todavía no hay operaciones de compra de créditos.</p>
          ) : (
            creditos.map((cr) => (
              <div key={cr.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleCredito(cr)} style={{ cursor: "pointer" }}>
                  <h4>{clienteNombre(cr.cliente_id)}</h4>
                  <div className="loc">
                    Fecha {new Date(cr.fecha).toLocaleDateString("es-ES")} · Bruto (precio) {fmt(cr.precio)}
                  </div>
                  {creditoAbierto === cr.id && (
                    <div className="loc">Neto {fmt(netoDeOperacion(cr.precio, creditoGastos[cr.id] ?? []))}</div>
                  )}
                </div>
                <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                  <button type="button" className="btn-ghost" onClick={() => eliminarOperacionCredito(cr.id)}>
                    Eliminar operación
                  </button>
                </div>

                {creditoAbierto === cr.id && (
                  <div className="chat-transcript">
                    <form className="lead-form-row" onSubmit={(e) => añadirGastoCredito(cr.id, e)}>
                      <label>
                        Concepto
                        <input required value={nuevoGastoCredito.concepto} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, concepto: e.target.value })} placeholder="Coste de gestión, comisión pasarela..." />
                      </label>
                      <label>
                        Importe (€)
                        <input type="number" min={0} required value={nuevoGastoCredito.importe} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, importe: e.target.value })} />
                      </label>
                      <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input type="checkbox" checked={nuevoGastoCredito.esNegativo} onChange={(e) => setNuevoGastoCredito({ ...nuevoGastoCredito, esNegativo: e.target.checked })} />
                        Resta del neto (gasto)
                      </label>
                      <button type="submit" className="btn-primary">Añadir movimiento</button>
                    </form>
                    <p className="admin-empty" style={{ margin: "4px 0 12px" }}>
                      Desmarca la casilla para un ingreso extra que suma al neto en vez de restar.
                    </p>
                    {(creditoGastos[cr.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {g.es_negativo ? "-" : "+"}{fmt(g.importe)}</span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoCreditoPagado(cr.id, g.id, e.target.checked)} />
                            Liquidado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGastoCredito(cr.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(creditoGastos[cr.id] ?? []).length === 0 && <p className="admin-empty">Sin movimientos registrados todavía.</p>}

                    <div className="lead-form-row" style={{ marginTop: 16 }}>
                      <label style={{ flex: 1 }}>
                        Adjuntar documento (PDF)
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={subiendoDocumentoCredito}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirDocumentoCredito(cr.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {(creditoDocumentos[cr.id] ?? []).map((doc) => (
                      <div key={doc.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <a href={`/api/admin/credito-documentos/${doc.id}`} target="_blank" rel="noreferrer">
                          {doc.nombre}
                        </a>
                        <button type="button" className="btn-ghost" onClick={() => eliminarDocumentoCredito(cr.id, doc.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(creditoDocumentos[cr.id] ?? []).length === 0 && <p className="admin-empty">Sin documentos adjuntos.</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "alquileres" && (
        <div className="articulos-list-section" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2>Alquileres ({clientesConAlquiler.length})</h2>
            <button type="button" className="btn-primary" onClick={() => setMostrarActivarAlquiler((v) => !v)}>
              {mostrarActivarAlquiler ? "Cancelar" : "Activar alquiler"}
            </button>
          </div>

          {mostrarActivarAlquiler && (
            <form className="piso-form" onSubmit={activarCliente}>
              <label>
                Cliente propietario
                <select required value={activarAlquiler.cliente_id} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, cliente_id: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {propietariosInactivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lead-form-row">
                <label>
                  Mensualidad (€)
                  <input type="number" min={0} required value={activarAlquiler.mensualidad} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, mensualidad: e.target.value })} />
                </label>
                <label>
                  % Comisión
                  <input type="number" min={0} step="0.1" value={activarAlquiler.comision_pct} onChange={(e) => setActivarAlquiler({ ...activarAlquiler, comision_pct: e.target.value })} />
                </label>
              </div>
              {propietariosInactivos.length === 0 && (
                <p className="admin-empty">Todos los propietarios ya tienen un alquiler activo. Crea el cliente primero en la pestaña Clientes.</p>
              )}
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Activar</button>
              </div>
            </form>
          )}

          {clientesConAlquiler.length === 0 ? (
            <p className="admin-empty">Todavía no hay alquileres activos. Actívalos desde aquí para un propietario ya creado en Clientes.</p>
          ) : (
            clientesConAlquiler.map((cliente) => (
              <div key={cliente.id} className="pisos-list-item">
                <div className="pisos-list-body" onClick={() => toggleCliente(cliente)} style={{ cursor: "pointer" }}>
                  <h4>{cliente.nombre} {cliente.apellidos}</h4>
                  <div className="loc">
                    {cliente.telefono || "sin teléfono"} · {cliente.zona_interes || "sin zona"} · mensualidad {fmt(cliente.mensualidad)}
                  </div>
                </div>

                {clienteAbierto === cliente.id && (
                  <div className="chat-transcript">
                    <div className="lead-form-row">
                      <label>
                        Mensualidad activa (€)
                        <input type="number" min={0} value={mensualidadInput} onChange={(e) => setMensualidadInput(e.target.value)} placeholder="0 = pausado" />
                      </label>
                      <button type="button" className="btn-primary" onClick={() => actualizarMensualidad(cliente.id)}>
                        Actualizar mensualidad
                      </button>
                    </div>
                    <p className="admin-empty" style={{ margin: "4px 0 12px" }}>
                      Cada mes se genera solo mientras la mensualidad sea mayor que 0. Ponla a 0 para pausar (por ejemplo, si el inquilino se va).
                    </p>

                    {(() => {
                      const lista = ingresos[cliente.id] ?? [];
                      const año = new Date().getUTCFullYear();
                      const totalAño = lista.filter((i) => añoActual(i.mes) === año).reduce((s, i) => s + i.comision_calculada, 0);
                      const pendientes = lista.filter((i) => !i.cobrado).length;
                      return (
                        <p className="loc" style={{ marginBottom: 12 }}>
                          Comisión {año}: {fmt(totalAño)} · Meses sin cobrar: {pendientes}
                        </p>
                      );
                    })()}

                    {(ingresos[cliente.id] ?? []).map((ing) => (
                      <div key={ing.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{ing.mes.slice(0, 7)} — ingreso {fmt(ing.ingreso_bruto)}, comisión {fmt(ing.comision_calculada)}</span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={ing.cobrado} onChange={(e) => toggleIngresoCobrado(cliente.id, ing.id, e.target.checked)} />
                            Cobrado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarIngreso(cliente.id, ing.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(ingresos[cliente.id] ?? []).length === 0 && <p className="admin-empty">Sin meses registrados todavía.</p>}

                    <div className="lead-form-actions" style={{ marginTop: 12 }}>
                      <button type="button" className="btn-ghost" onClick={() => setMostrarAjusteManual((v) => !v)}>
                        {mostrarAjusteManual ? "Ocultar ajuste manual" : "Ajustar un mes manualmente"}
                      </button>
                    </div>
                    {mostrarAjusteManual && (
                      <form className="lead-form-row" onSubmit={(e) => añadirIngreso(cliente.id, e)}>
                        <label>
                          Mes
                          <input type="month" required value={nuevoIngreso.mes} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, mes: e.target.value })} />
                        </label>
                        <label>
                          Ingreso bruto (€)
                          <input type="number" min={0} required value={nuevoIngreso.ingresoBruto} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, ingresoBruto: e.target.value })} />
                        </label>
                        <button type="submit" className="btn-primary">Guardar mes</button>
                      </form>
                    )}
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
                    Cierre {new Date(op.fecha_cierre).toLocaleDateString("es-ES")} · Venta {fmt(op.precio_venta)} · Bruto (comisión) {fmt(op.comision_calculada)}
                  </div>
                  {operacionAbierta === op.id && (
                    <div className="loc">Ganancia neta {fmt(netoDeOperacion(op.comision_calculada, gastos[op.id] ?? []))}</div>
                  )}
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
                      <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input type="checkbox" checked={nuevoGasto.esNegativo} onChange={(e) => setNuevoGasto({ ...nuevoGasto, esNegativo: e.target.checked })} />
                        Resta del neto (gasto)
                      </label>
                      <button type="submit" className="btn-primary">Añadir movimiento</button>
                    </form>
                    <p className="admin-empty" style={{ margin: "4px 0 12px" }}>
                      Desmarca la casilla para un ingreso extra que suma al neto en vez de restar.
                    </p>
                    {(gastos[op.id] ?? []).map((g) => (
                      <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <span>{g.concepto} — {g.es_negativo ? "-" : "+"}{fmt(g.importe)}</span>
                        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input type="checkbox" checked={g.pagado} onChange={(e) => toggleGastoPagado(op.id, g.id, e.target.checked)} />
                            Liquidado
                          </label>
                          <button type="button" className="btn-ghost" onClick={() => eliminarGasto(op.id, g.id)}>
                            Borrar
                          </button>
                        </span>
                      </div>
                    ))}
                    {(gastos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin movimientos registrados todavía.</p>}

                    <div className="lead-form-row" style={{ marginTop: 16 }}>
                      <label style={{ flex: 1 }}>
                        Adjuntar documento (PDF)
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={subiendoDocumento}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subirDocumento(op.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {(documentos[op.id] ?? []).map((doc) => (
                      <div key={doc.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <a href={`/api/admin/documentos/${doc.id}`} target="_blank" rel="noreferrer">
                          {doc.nombre}
                        </a>
                        <button type="button" className="btn-ghost" onClick={() => eliminarDocumento(op.id, doc.id)}>
                          Borrar
                        </button>
                      </div>
                    ))}
                    {(documentos[op.id] ?? []).length === 0 && <p className="admin-empty">Sin documentos adjuntos. Súbelos aquí para poder pedírselos luego al bot de Telegram.</p>}
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
