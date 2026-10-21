"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: string;
  zona_interes: string | null;
  mensualidad: number;
  comision_pct_alquiler: number;
  comision_fija_alquiler: number | null;
  alquiler_fecha_inicio: string | null;
  alquiler_fecha_fin: string | null;
};

type Ingreso = {
  id: string;
  mes: string;
  ingreso_bruto: number;
  comision_pct: number;
  comision_calculada: number;
  cobrado: boolean;
  factura_storage_path: string | null;
};

type Factura = {
  id: string;
  numero: string;
  origen: string;
  origen_id: string | null;
};

type Pendiente = {
  cliente: { id: string; nombre: string; nif: string | null; direccion: string | null; cp_ciudad: string | null; telefono: string | null; es_empresa: boolean };
  pagos: { origen: string; origen_id: string; concepto: string; base: number; fecha: string; ya_facturado: boolean }[];
  numeroSugerido: string;
};

type ClienteGasto = {
  id: string;
  cliente_id: string;
  concepto: string;
  importe: number;
  categoria: string;
  es_recurrente: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  pagado: boolean;
  fecha_pago: string | null;
  pagado_por: string | null;
  notas: string | null;
};

const CATEGORIAS_GASTO: { value: string; label: string }[] = [
  { value: "propietario", label: "Renta al propietario" },
  { value: "comunidad", label: "Comunidad" },
  { value: "ibi", label: "IBI" },
  { value: "seguro", label: "Seguro" },
  { value: "suministros", label: "Suministros" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "obra", label: "Obra" },
  { value: "reforma", label: "Reforma" },
  { value: "notaria", label: "Notaría" },
  { value: "registro", label: "Registro" },
  { value: "impuestos", label: "Impuestos" },
  { value: "comision", label: "Comisión" },
  { value: "otros", label: "Otros" },
];

function labelCategoria(v: string | undefined) {
  const found = CATEGORIAS_GASTO.find((c) => c.value === v);
  return found ? found.label : "Otros";
}

function Info({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 14, height: 14, marginLeft: 4, borderRadius: "50%",
        background: "#e7e2db", color: "#57534e", fontSize: 10, fontWeight: 700,
        cursor: "help", verticalAlign: "middle", lineHeight: 1,
      }}
    >
      ?
    </span>
  );
}

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmt = (n: number) => EUR.format(n || 0);
const añoActual = (mes: string) => new Date(mes).getUTCFullYear();

type Tab = "pagos" | "partidas" | "resumen" | "config";

export default function ClienteContabilidadManager({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [gastos, setGastos] = useState<ClienteGasto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("pagos");

  const [genModal, setGenModal] = useState<{ ingresoId: string; numero: string; esEmpresa: boolean; generando: boolean; error: string } | null>(null);

  const [mensualidadInput, setMensualidadInput] = useState("");
  const [mostrarAjusteManual, setMostrarAjusteManual] = useState(false);
  const [nuevoIngreso, setNuevoIngreso] = useState({ mes: "", ingresoBruto: "", comisionManual: "" });

  const [editandoAlquiler, setEditandoAlquiler] = useState(false);
  const [editAlquilerForm, setEditAlquilerForm] = useState({ mensualidad: "", comision_pct: "", comision_fija: "", fecha_inicio: "", fecha_fin: "" });

  const [subiendoFactura, setSubiendoFactura] = useState<string | null>(null);
  const [mostrarNuevoGasto, setMostrarNuevoGasto] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({
    concepto: "",
    importe: "",
    categoria: "propietario",
    esRecurrente: true,
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaPago: "",
    pagado: false,
    pagadoPor: "",
  });

  const cargarCliente = useCallback(async () => {
    const res = await fetch(`/api/admin/clientes/${clienteId}`);
    if (res.status === 404) { setNotFound(true); return; }
    const data = await res.json();
    setCliente(data);
    setMensualidadInput(String(data.mensualidad ?? 0));
  }, [clienteId]);

  const cargarIngresos = useCallback(async () => {
    const data = await fetch(`/api/admin/clientes/${clienteId}/ingresos`).then((r) => r.json());
    setIngresos(Array.isArray(data) ? data : []);
  }, [clienteId]);

  const cargarGastos = useCallback(async () => {
    const data = await fetch(`/api/admin/clientes/${clienteId}/gastos`).then((r) => r.json());
    setGastos(Array.isArray(data) ? data : []);
  }, [clienteId]);

  const cargarFacturas = useCallback(async () => {
    const data = await fetch(`/api/admin/facturas?clienteId=${clienteId}`).then((r) => r.json());
    setFacturas(Array.isArray(data) ? data : []);
  }, [clienteId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([cargarCliente(), cargarIngresos(), cargarGastos(), cargarFacturas()]);
      setLoading(false);
    })();
  }, [cargarCliente, cargarIngresos, cargarGastos, cargarFacturas]);

  async function actualizarMensualidad() {
    await fetch(`/api/admin/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensualidad: Number(mensualidadInput) || 0 }),
    });
    await Promise.all([cargarCliente(), cargarIngresos()]);
  }

  function abrirEditarAlquiler() {
    if (!cliente) return;
    setEditandoAlquiler(true);
    setEditAlquilerForm({
      mensualidad: String(cliente.mensualidad ?? 0),
      comision_pct: String(cliente.comision_pct_alquiler ?? 15),
      comision_fija: cliente.comision_fija_alquiler != null ? String(cliente.comision_fija_alquiler) : "",
      fecha_inicio: cliente.alquiler_fecha_inicio ?? "",
      fecha_fin: cliente.alquiler_fecha_fin ?? "",
    });
  }

  async function guardarEditarAlquiler() {
    const f = editAlquilerForm;
    await fetch(`/api/admin/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensualidad: Number(f.mensualidad) || 0,
        comision_pct_alquiler: Number(f.comision_pct) || 15,
        comision_fija_alquiler: f.comision_fija ? Number(f.comision_fija) : null,
        alquiler_fecha_inicio: f.fecha_inicio || null,
        alquiler_fecha_fin: f.fecha_fin || null,
      }),
    });
    setEditandoAlquiler(false);
    await Promise.all([cargarCliente(), cargarIngresos()]);
  }

  async function borrarAlquiler() {
    if (!confirm("Esto pondrá la mensualidad a 0 y borrará todos los meses de ingresos registrados. El cliente se mantiene en Clientes. ¿Continuar?")) return;
    await fetch(`/api/admin/clientes/${clienteId}/ingresos`, { method: "DELETE" });
    await fetch(`/api/admin/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensualidad: 0 }),
    });
    router.push("/admin/contabilidad");
  }

  async function toggleIngresoCobrado(ingresoId: string, cobrado: boolean) {
    await fetch(`/api/admin/ingresos/${ingresoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cobrado }),
    });
    await cargarIngresos();
  }

  async function añadirIngreso(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/clientes/${clienteId}/ingresos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes: nuevoIngreso.mes + "-01",
        ingreso_bruto: Number(nuevoIngreso.ingresoBruto) || 0,
        comision_manual: nuevoIngreso.comisionManual ? Number(nuevoIngreso.comisionManual) : undefined,
      }),
    });
    setNuevoIngreso({ mes: "", ingresoBruto: "", comisionManual: "" });
    setMostrarAjusteManual(false);
    await cargarIngresos();
  }

  async function eliminarIngreso(ingresoId: string) {
    await fetch(`/api/admin/ingresos/${ingresoId}`, { method: "DELETE" });
    await cargarIngresos();
  }

  async function subirFacturaIngreso(ingresoId: string, file: File) {
    setSubiendoFactura(ingresoId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/ingresos/${ingresoId}/factura`, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No se pudo subir la factura");
      } else {
        await cargarIngresos();
      }
    } finally {
      setSubiendoFactura(null);
    }
  }

  async function borrarFacturaIngreso(ingresoId: string) {
    if (!confirm("¿Eliminar la factura adjunta de este mes?")) return;
    await fetch(`/api/admin/ingresos/${ingresoId}/factura`, { method: "DELETE" });
    await cargarIngresos();
  }

  async function abrirGenerarFactura(ingresoId: string) {
    const res = await fetch(`/api/admin/facturas/pendientes?clienteId=${clienteId}`);
    const data: Pendiente | { error: string } = await res.json();
    if (!res.ok || !("cliente" in data)) {
      alert("No se pudo cargar el número sugerido: " + ("error" in data ? data.error : "error"));
      return;
    }
    setGenModal({ ingresoId, numero: data.numeroSugerido, esEmpresa: data.cliente.es_empresa, generando: false, error: "" });
  }

  async function confirmarGenerarFactura() {
    if (!genModal || !cliente) return;
    const ingreso = ingresos.find((i) => i.id === genModal.ingresoId);
    if (!ingreso) return;
    if (!genModal.numero.trim()) { setGenModal({ ...genModal, error: "Falta el número de factura." }); return; }
    if (!cliente.nombre) { setGenModal({ ...genModal, error: "Falta el nombre del cliente." }); return; }
    setGenModal({ ...genModal, generando: true, error: "" });
    try {
      const mesLabel = (() => { const d = ingreso.mes.slice(0, 10).split("-"); return `${d[1]}/${d[0]}`; })();
      const concepto = `Comisión alquiler ${mesLabel}`;
      const base = Math.round((ingreso.comision_calculada / 1.21) * 100) / 100;
      const res = await fetch("/api/admin/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: genModal.numero.trim(),
          cliente_id: clienteId,
          origen: "ingreso",
          origen_id: genModal.ingresoId,
          fecha: ingreso.mes.slice(0, 10),
          concepto,
          cliente_nombre: `${cliente.nombre} ${cliente.apellidos ?? ""}`.trim(),
          es_empresa: genModal.esEmpresa,
          iva_pct: 21,
          irpf_pct: genModal.esEmpresa ? 15 : 0,
          lineas: [{ descripcion: `${concepto} — ${cliente.nombre} ${cliente.apellidos ?? ""}`.trim(), base }],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setGenModal({ ...genModal, generando: false, error: data.error || "Error generando factura" }); return; }
      window.open(`/api/admin/facturas/${data.id}`, "_blank");
      setGenModal(null);
      await cargarFacturas();
    } catch (e) {
      setGenModal({ ...genModal, generando: false, error: e instanceof Error ? e.message : "Error" });
    }
  }

  async function crearGasto(e: React.FormEvent) {
    e.preventDefault();
    const g = nuevoGasto;
    await fetch(`/api/admin/clientes/${clienteId}/gastos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concepto: g.concepto,
        importe: Number(g.importe) || 0,
        categoria: g.categoria,
        es_recurrente: g.esRecurrente,
        fecha_inicio: g.esRecurrente ? g.fechaInicio : null,
        fecha_pago: !g.esRecurrente && g.fechaPago ? g.fechaPago : null,
        pagado: !g.esRecurrente ? g.pagado : false,
        pagado_por: g.pagadoPor || null,
      }),
    });
    setNuevoGasto({ concepto: "", importe: "", categoria: "propietario", esRecurrente: true, fechaInicio: new Date().toISOString().slice(0, 10), fechaPago: "", pagado: false, pagadoPor: "" });
    setMostrarNuevoGasto(false);
    await cargarGastos();
  }

  async function toggleGastoPagado(gastoId: string, pagado: boolean) {
    await fetch(`/api/admin/cliente-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado, fecha_pago: pagado ? new Date().toISOString().slice(0, 10) : null }),
    });
    await cargarGastos();
  }

  async function terminarGastoRecurrente(gastoId: string) {
    const hoy = new Date().toISOString().slice(0, 10);
    await fetch(`/api/admin/cliente-gastos/${gastoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha_fin: hoy }),
    });
    await cargarGastos();
  }

  async function eliminarGasto(gastoId: string) {
    if (!confirm("¿Eliminar esta partida?")) return;
    await fetch(`/api/admin/cliente-gastos/${gastoId}`, { method: "DELETE" });
    await cargarGastos();
  }

  if (loading) return <p className="admin-empty">Cargando…</p>;
  if (notFound || !cliente) return <p className="admin-empty">Cliente no encontrado. <a href="/admin/contabilidad">Volver</a></p>;

  const año = new Date().getUTCFullYear();
  const totalAño = ingresos.filter((i) => añoActual(i.mes) === año).reduce((s, i) => s + i.comision_calculada, 0);
  const pendientes = ingresos.filter((i) => !i.cobrado).length;
  const brutoAño = totalAño;
  const gastoRecurrenteMes = gastos.filter((g) => g.es_recurrente && (!g.fecha_fin || g.fecha_fin >= new Date().toISOString().slice(0, 10))).reduce((s, g) => s + g.importe, 0);
  const mesesTranscurridos = new Date().getUTCMonth() + 1;
  const gastoAcumulado = gastoRecurrenteMes * mesesTranscurridos + gastos.filter((g) => !g.es_recurrente && g.pagado && g.fecha_pago && g.fecha_pago.startsWith(String(año))).reduce((s, g) => s + g.importe, 0);
  const baseAño = Math.round((brutoAño / 1.21) * 100) / 100;
  const ivaAño = Math.round((brutoAño - baseAño) * 100) / 100;
  const rentabilidadPiso = baseAño - gastoAcumulado;
  const meses = Math.max(mesesTranscurridos, 1);
  const recurrentes = gastos.filter((g) => g.es_recurrente);
  const puntuales = gastos.filter((g) => !g.es_recurrente);

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 style={{ marginBottom: 4 }}>{cliente.nombre} {cliente.apellidos ?? ""}</h2>
          <p className="loc" style={{ margin: 0 }}>
            {cliente.telefono || "sin teléfono"} · {cliente.zona_interes || "sin zona"} · mensualidad {fmt(cliente.mensualidad)}
            {cliente.alquiler_fecha_inicio && ` · desde ${cliente.alquiler_fecha_inicio}`}
            {cliente.alquiler_fecha_fin && ` hasta ${cliente.alquiler_fecha_fin}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "4px 10px", background: "#f3f4f6", borderRadius: 20, fontSize: 12 }}>Comisión {año}: <b>{fmt(totalAño)}</b></span>
          <span style={{ padding: "4px 10px", background: pendientes > 0 ? "#fef3c7" : "#d1fae5", color: pendientes > 0 ? "#92400e" : "#065f46", borderRadius: 20, fontSize: 12 }}>Pendientes: <b>{pendientes}</b></span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #e7e2db" }}>
        {([
          { k: "pagos", l: `Pagos mensuales (${ingresos.length})` },
          { k: "partidas", l: `Partidas (${gastos.length})` },
          { k: "resumen", l: "Resumen P&L" },
          { k: "config", l: "Configuración" },
        ] as { k: Tab; l: string }[]).map((t) => (
          <button
            key={t.k}
            type="button"
            className={`contabilidad-tab${tab === t.k ? " active" : ""}`}
            onClick={() => setTab(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "pagos" && (
        <div className="articulos-list-section">
          <div className="lead-form-row" style={{ alignItems: "end" }}>
            <label>
              Mensualidad activa (€)
              <input type="number" min={0} value={mensualidadInput} onChange={(e) => setMensualidadInput(e.target.value)} placeholder="0 = pausado" />
            </label>
            <button type="button" className="btn-primary" onClick={actualizarMensualidad}>
              Actualizar mensualidad
            </button>
          </div>
          <p className="admin-empty" style={{ margin: "4px 0 12px" }}>
            Cada mes se genera solo mientras la mensualidad sea mayor que 0. Ponla a 0 para pausar (por ejemplo, si el inquilino se va).
          </p>

          {ingresos.map((ing) => {
            const facturaGen = facturas.find((f) => f.origen === "ingreso" && f.origen_id === ing.id);
            return (
            <div key={ing.id} className="chat-widget-msg assistant" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span>
                  <b>Mensualidad {(() => { const d = ing.mes.slice(0, 10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; })()}</b>
                  {" — "}bruto {fmt(ing.ingreso_bruto)}, comisión {fmt(ing.comision_calculada)}
                  {!ing.cobrado && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>Pendiente</span>}
                  {ing.cobrado && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Cobrado</span>}
                  {ing.factura_storage_path && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#e0e7ff", color: "#3730a3", borderRadius: 4, fontSize: 11 }}>PDF adjunto</span>}
                  {facturaGen && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontSize: 11 }}>Factura {facturaGen.numero}</span>}
                </span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!ing.cobrado ? (
                    <button type="button" className="btn-primary" style={{ fontSize: 12, padding: "4px 10px", whiteSpace: "nowrap" }} onClick={() => {
                      const mesLabel = (() => { const d = ing.mes.slice(0, 10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; })();
                      if (confirm(`¿Confirmar el pago de la mensualidad del ${mesLabel} por ${fmt(ing.comision_calculada)}?`)) {
                        toggleIngresoCobrado(ing.id, true);
                      }
                    }}>
                      Confirmar pago
                    </button>
                  ) : (
                    <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px", whiteSpace: "nowrap" }} onClick={() => {
                      if (confirm("¿Desmarcar este pago como cobrado?")) {
                        toggleIngresoCobrado(ing.id, false);
                      }
                    }}>
                      Desmarcar cobro
                    </button>
                  )}
                  <button type="button" className="btn-ghost" onClick={() => eliminarIngreso(ing.id)}>
                    Borrar
                  </button>
                </span>
              </div>
              {ing.cobrado && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
                  {facturaGen ? (
                    <a href={`/api/admin/facturas/${facturaGen.id}`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }}>
                      Ver factura {facturaGen.numero}
                    </a>
                  ) : (
                    <button type="button" className="btn-primary" style={{ fontSize: 12, padding: "3px 10px" }} onClick={() => abrirGenerarFactura(ing.id)}>
                      Generar factura
                    </button>
                  )}
                  <span style={{ opacity: 0.4, fontSize: 11 }}>·</span>
                  {ing.factura_storage_path ? (
                    <>
                      <a href={`/api/admin/ingresos/${ing.id}/factura`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }}>
                        Ver PDF adjunto
                      </a>
                      <label className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer" }}>
                        {subiendoFactura === ing.id ? "Subiendo…" : "Reemplazar"}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFacturaIngreso(ing.id, f); e.target.value = ""; }} />
                      </label>
                      <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px", color: "#dc2626" }} onClick={() => borrarFacturaIngreso(ing.id)}>
                        Eliminar PDF
                      </button>
                    </>
                  ) : (
                    <label className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px", cursor: "pointer" }}>
                      {subiendoFactura === ing.id ? "Subiendo…" : "Subir PDF externo"}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFacturaIngreso(ing.id, f); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              )}
            </div>
            );
          })}
          {ingresos.length === 0 && <p className="admin-empty">Sin meses registrados todavía.</p>}

          <div className="lead-form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn-ghost" onClick={() => setMostrarAjusteManual((v) => !v)}>
              {mostrarAjusteManual ? "Ocultar ajuste manual" : "Ajustar un mes manualmente"}
            </button>
          </div>
          {mostrarAjusteManual && (
            <form className="lead-form-row" onSubmit={añadirIngreso}>
              <label>
                Mes
                <input type="month" required value={nuevoIngreso.mes} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, mes: e.target.value })} />
              </label>
              <label>
                Ingreso bruto (€)
                <input type="number" min={0} required value={nuevoIngreso.ingresoBruto} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, ingresoBruto: e.target.value })} />
              </label>
              <label>
                Comisión € (opcional, sobrescribe %)
                <input type="number" min={0} step="0.01" value={nuevoIngreso.comisionManual} onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, comisionManual: e.target.value })} placeholder="auto según %" />
              </label>
              <button type="submit" className="btn-primary">Guardar mes</button>
            </form>
          )}
        </div>
      )}

      {tab === "partidas" && (
        <div className="articulos-list-section">
          <div className="section-head">
            <h4 style={{ margin: 0 }}>Partidas presupuestarias</h4>
            <button type="button" className="btn-primary" onClick={() => setMostrarNuevoGasto((v) => !v)}>
              {mostrarNuevoGasto ? "Cancelar" : "+ Añadir partida"}
            </button>
          </div>

          {mostrarNuevoGasto && (
            <form className="piso-form" onSubmit={crearGasto}>
              <div className="lead-form-row">
                <label>
                  Concepto
                  <input required value={nuevoGasto.concepto} onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })} placeholder="Renta al propietario" />
                </label>
                <label>
                  Importe (€) <span style={{ opacity: 0.5, fontSize: 11 }}>negativo = pago a cobrar</span>
                  <input type="number" step="0.01" required value={nuevoGasto.importe} onChange={(e) => setNuevoGasto({ ...nuevoGasto, importe: e.target.value })} />
                </label>
                <label>
                  Categoría
                  <select value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })}>
                    {CATEGORIAS_GASTO.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="lead-form-row">
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={nuevoGasto.esRecurrente} onChange={(e) => setNuevoGasto({ ...nuevoGasto, esRecurrente: e.target.checked })} />
                  Recurrente (todos los meses)
                </label>
                {nuevoGasto.esRecurrente ? (
                  <label>
                    Desde
                    <input type="date" value={nuevoGasto.fechaInicio} onChange={(e) => setNuevoGasto({ ...nuevoGasto, fechaInicio: e.target.value })} />
                  </label>
                ) : (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="checkbox" checked={nuevoGasto.pagado} onChange={(e) => setNuevoGasto({ ...nuevoGasto, pagado: e.target.checked })} />
                      Ya pagado
                    </label>
                    <label>
                      Fecha pago
                      <input type="date" value={nuevoGasto.fechaPago} onChange={(e) => setNuevoGasto({ ...nuevoGasto, fechaPago: e.target.value })} />
                    </label>
                  </>
                )}
                <label>
                  Pagado por
                  <input value={nuevoGasto.pagadoPor} onChange={(e) => setNuevoGasto({ ...nuevoGasto, pagadoPor: e.target.value })} placeholder="Nombre de quien adelantó" />
                </label>
              </div>
              <div className="lead-form-actions">
                <button type="submit" className="btn-primary">Guardar partida</button>
              </div>
            </form>
          )}

          {recurrentes.length > 0 && (
            <>
              <p className="loc" style={{ marginTop: 10, marginBottom: 4 }}><b>Recurrentes mensuales</b></p>
              {recurrentes.map((g) => (
                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <span>
                    <b style={{ color: g.importe < 0 ? "#059669" : undefined }}>{fmt(g.importe)}/mes</b> · {g.concepto} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span>
                    {g.pagado_por && <span style={{ opacity: 0.6, marginLeft: 8 }}>pagado por {g.pagado_por}</span>}
                    {g.fecha_inicio && <span style={{ opacity: 0.5, marginLeft: 8 }}>desde {g.fecha_inicio}</span>}
                    {g.fecha_fin && <span style={{ opacity: 0.5, marginLeft: 8 }}>hasta {g.fecha_fin}</span>}
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    {!g.fecha_fin && (
                      <button type="button" className="btn-ghost" onClick={() => terminarGastoRecurrente(g.id)}>Finalizar</button>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => eliminarGasto(g.id)}>Borrar</button>
                  </span>
                </div>
              ))}
            </>
          )}

          {puntuales.length > 0 && (
            <>
              <p className="loc" style={{ marginTop: 10, marginBottom: 4 }}><b>Puntuales</b></p>
              {puntuales.map((g) => (
                <div key={g.id} className="chat-widget-msg assistant" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <span>
                    <b style={{ color: g.importe < 0 ? "#059669" : undefined }}>{fmt(g.importe)}</b> · {g.concepto} · <span style={{ opacity: 0.6 }}>{labelCategoria(g.categoria)}</span>
                    {g.pagado_por && <span style={{ opacity: 0.6, marginLeft: 8 }}>pagado por {g.pagado_por}</span>}
                    {g.fecha_pago && <span style={{ opacity: 0.5, marginLeft: 8 }}>{g.fecha_pago}</span>}
                    {!g.pagado && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>Pendiente</span>}
                    {g.pagado && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#d1fae5", color: "#065f46", borderRadius: 4, fontSize: 11 }}>Cobrado</span>}
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!g.pagado ? (
                      <button type="button" className="btn-primary" style={{ fontSize: 12, padding: "4px 10px", whiteSpace: "nowrap" }} onClick={() => toggleGastoPagado(g.id, true)}>
                        Liquidar
                      </button>
                    ) : (
                      <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => toggleGastoPagado(g.id, false)}>
                        Desmarcar
                      </button>
                    )}
                    <button type="button" className="btn-ghost" onClick={() => eliminarGasto(g.id)}>Borrar</button>
                  </span>
                </div>
              ))}
            </>
          )}

          {gastos.length === 0 && <p className="admin-empty" style={{ marginTop: 8 }}>Sin partidas presupuestarias. Añade la renta al propietario, comunidad, IBI, etc.</p>}
        </div>
      )}

      {tab === "resumen" && (
        <div className="articulos-list-section">
          <div className="pnl-card">
            <div><b>{fmt(brutoAño)}</b><span>Bruto {año} (IVA incl.) <Info text={`Suma de todas las comisiones facturadas a este cliente en ${año}. Como la comisión que cobras ya incluye el 21% de IVA, este número es con IVA incluido.`} /></span></div>
            <div><b>{fmt(baseAño)}</b><span>Base (sin IVA) <Info text="El bruto quitándole el IVA (bruto ÷ 1,21). Es la base imponible real: lo que de verdad entra a tu cuenta como ingreso antes de impuestos sobre beneficios." /></span></div>
            <div><b>{fmt(ivaAño)}</b><span>IVA 21% <Info text="El IVA repercutido (bruto − base). No es tuyo: lo liquidas con Hacienda cada trimestre en el modelo 303." /></span></div>
            <div className={baseAño >= 0 ? "pnl-pos" : "pnl-neg"}><b>{fmt(baseAño)}</b><span>Neto InterRoom {año} <Info text={`Lo que se queda InterRoom de este cliente en ${año} antes de impuestos sobre beneficios (IRPF/sociedades). Equivale a la base imponible, porque los gastos del piso los paga el propietario.`} /></span></div>
            <div><b>{fmt(baseAño / meses)}</b><span>Neto InterRoom/mes <Info text={`Neto del año dividido entre los meses transcurridos de ${año} (${meses}). Útil para ver el ritmo mensual.`} /></span></div>
          </div>
          <div className="pnl-card" style={{ marginTop: 8 }}>
            <div><b>{fmt(gastoAcumulado)}</b><span>Gastos casero {año} <Info text={`Gastos del piso en ${año} que afectan a la rentabilidad del propietario: recurrentes (comunidad, IBI, suministros, renta…) × meses transcurridos + puntuales pagados este año. No son gastos de InterRoom.`} /></span></div>
            <div><b>{fmt(gastoRecurrenteMes)}</b><span>Gasto recurrente/mes <Info text="Suma de todas las partidas marcadas como recurrentes y aún activas. Es el coste fijo mensual del piso." /></span></div>
            <div className={rentabilidadPiso >= 0 ? "pnl-pos" : "pnl-neg"}><b>{fmt(rentabilidadPiso)}</b><span>Rentabilidad piso {año} <Info text={`Base (sin IVA) − gastos acumulados del casero en ${año}. Es lo que le queda al propietario del piso tras pagar tu comisión y los gastos corrientes. Positivo = el piso le renta.`} /></span></div>
            <div><b>{fmt(rentabilidadPiso / meses)}</b><span>Rentabilidad/mes <Info text={`Rentabilidad del año dividida entre los meses transcurridos (${meses}). Ritmo mensual neto del piso para el propietario.`} /></span></div>
          </div>
        </div>
      )}

      {genModal && (
        <div onClick={() => !genModal.generando && setGenModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Generar factura</h3>
            <p className="loc" style={{ marginTop: 0, marginBottom: 16, fontSize: 13 }}>
              Confirma el número antes de generar. Si ya has emitido facturas manualmente, ajústalo para que la secuencia no se solape.
            </p>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#57534e", marginBottom: 4 }}>Nº de factura</span>
              <input autoFocus value={genModal.numero} onChange={(e) => setGenModal({ ...genModal, numero: e.target.value })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d6cfc6", borderRadius: 8, fontSize: 14 }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13 }}>
              <input type="checkbox" checked={genModal.esEmpresa} onChange={(e) => setGenModal({ ...genModal, esEmpresa: e.target.checked })} />
              Modelo empresa (IRPF 15%)
            </label>
            {genModal.error && <p style={{ color: "#dc2626", marginTop: 0, marginBottom: 12, fontSize: 13 }}>{genModal.error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" disabled={genModal.generando} onClick={() => setGenModal(null)}>Cancelar</button>
              <button type="button" className="btn-primary" disabled={genModal.generando} onClick={confirmarGenerarFactura}>
                {genModal.generando ? "Generando…" : "Generar y abrir PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "config" && (
        <div className="articulos-list-section">
          {!editandoAlquiler ? (
            <div className="lead-form-actions">
              <button type="button" className="btn-primary" onClick={abrirEditarAlquiler}>Editar alquiler</button>
              <button type="button" className="btn-ghost" style={{ color: "#dc2626" }} onClick={borrarAlquiler}>Borrar alquiler</button>
            </div>
          ) : (
            <div className="chat-transcript" style={{ marginBottom: 12 }}>
              <div className="lead-form-row">
                <label>Mensualidad (€)<input type="number" min={0} value={editAlquilerForm.mensualidad} onChange={(e) => setEditAlquilerForm({ ...editAlquilerForm, mensualidad: e.target.value })} /></label>
                <label>Comisión %<input type="number" min={0} max={100} value={editAlquilerForm.comision_pct} onChange={(e) => setEditAlquilerForm({ ...editAlquilerForm, comision_pct: e.target.value })} /></label>
                <label>Comisión fija (€, opcional)<input type="number" min={0} value={editAlquilerForm.comision_fija} onChange={(e) => setEditAlquilerForm({ ...editAlquilerForm, comision_fija: e.target.value })} placeholder="Vacío = usar %" /></label>
              </div>
              <div className="lead-form-row">
                <label>Fecha inicio<input type="date" value={editAlquilerForm.fecha_inicio} onChange={(e) => setEditAlquilerForm({ ...editAlquilerForm, fecha_inicio: e.target.value })} /></label>
                <label>Fecha fin<input type="date" value={editAlquilerForm.fecha_fin} onChange={(e) => setEditAlquilerForm({ ...editAlquilerForm, fecha_fin: e.target.value })} /></label>
              </div>
              <div className="lead-form-actions">
                <button type="button" className="btn-primary" onClick={guardarEditarAlquiler}>Aceptar</button>
                <button type="button" className="btn-ghost" onClick={() => setEditandoAlquiler(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
