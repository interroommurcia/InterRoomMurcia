"use client";

import { useEffect, useMemo, useState } from "react";

type ClienteLite = { id: string; nombre: string; apellidos: string | null };
type Pago = {
  origen: "ingreso" | "compraventa" | "alquiler_comision" | "credito" | "manual";
  origen_id: string;
  fecha: string;
  concepto: string;
  base: number;
  cobrado: boolean;
  ya_facturado: boolean;
};
type FichaCliente = {
  id: string;
  nombre: string;
  nif: string | null;
  direccion: string | null;
  cp_ciudad: string | null;
  telefono: string | null;
  es_empresa: boolean;
};
type Factura = {
  id: string;
  numero: string;
  fecha: string;
  concepto: string;
  cliente_nombre: string;
  total: number;
  es_empresa: boolean;
};

type Pendiente = {
  origen: "ingreso" | "compraventa" | "alquiler_comision" | "credito";
  origen_id: string;
  fecha: string;
  concepto: string;
  base: number;
  cobrado: boolean;
  ya_facturado: boolean;
  cliente_id: string;
  cliente_nombre: string;
  cliente_nif: string | null;
  cliente_es_empresa: boolean;
};

// Replicada en cliente para predecir los números de la secuencia sin pedir
// al servidor por cada uno. Debe coincidir con lib/factura/numeracion.ts.
function sugerirSiguienteNumero(ultimo: string): string {
  const anio = new Date().getFullYear();
  const conAnio = ultimo.match(/^(\d{4})\s*[/\-]\s*(\d+)$/);
  if (conAnio) {
    const anioPrev = Number(conAnio[1]);
    const n = Number(conAnio[2]);
    return anioPrev === anio ? `${anio}/${n + 1}` : `${anio}/1`;
  }
  const soloNum = ultimo.match(/^(\d+)$/);
  if (soloNum) return String(Number(soloNum[1]) + 1);
  return ultimo;
}

const euro = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " €";
const r2 = (n: number) => Math.round(n * 100) / 100;

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e7e2db", borderRadius: 12, padding: 16, marginBottom: 16 };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#57534e" };
const input: React.CSSProperties = { font: "inherit", fontSize: 14, fontWeight: 500, textTransform: "none", letterSpacing: 0, padding: "8px 10px", border: "1px solid #d6cfc6", borderRadius: 8 };

export default function FacturasManager() {
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [ficha, setFicha] = useState<FichaCliente | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  // Formulario de factura
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState("Servicios");
  const [esEmpresa, setEsEmpresa] = useState(false);
  const [ivaPct, setIvaPct] = useState(21);
  const [irpfPct, setIrpfPct] = useState(0);
  const [pagoSel, setPagoSel] = useState<string>("");
  const [cNombre, setCNombre] = useState("");
  const [cNif, setCNif] = useState("");
  const [cDir, setCDir] = useState("");
  const [cCiudad, setCCiudad] = useState("");
  const [cTel, setCTel] = useState("");
  const [lineas, setLineas] = useState<{ descripcion: string; base: number }[]>([{ descripcion: "", base: 0 }]);

  // Vista bulk de pendientes
  const [verPendientes, setVerPendientes] = useState(false);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<{ numero: string; generando: boolean; error: string; resultado: null | { generadas: { numero: string; cliente_nombre: string; factura_id: string }[]; errores: { origen: string; origen_id: string; error: string }[] } } | null>(null);

  useEffect(() => {
    fetch("/api/admin/clientes")
      .then((r) => r.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => {});
    cargarFacturas();
  }, []);

  function cargarFacturas() {
    fetch("/api/admin/facturas")
      .then((r) => r.json())
      .then((d) => setFacturas(Array.isArray(d) ? d : []))
      .catch(() => {});
  }

  async function seleccionarCliente(id: string) {
    setClienteId(id);
    setPagoSel("");
    setError("");
    if (!id) {
      setFicha(null);
      setPagos([]);
      return;
    }
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/facturas/pendientes?clienteId=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFicha(data.cliente);
      setPagos(data.pagos);
      setNumero(data.numeroSugerido || "");
      setCNombre(data.cliente.nombre || "");
      setCNif(data.cliente.nif || "");
      setCDir(data.cliente.direccion || "");
      setCCiudad(data.cliente.cp_ciudad || "");
      setCTel(data.cliente.telefono || "");
      setEsEmpresa(data.cliente.es_empresa);
      setIrpfPct(data.cliente.es_empresa ? 15 : 0);
      setLineas([{ descripcion: "", base: 0 }]);
      setConcepto("Servicios");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  function elegirPago(p: Pago) {
    setPagoSel(p.origen_id);
    setConcepto(p.concepto.split(" — ")[0]);
    setLineas([{ descripcion: p.concepto, base: p.base }]);
    setFecha(p.fecha);
  }

  function cambiarModelo(empresa: boolean) {
    setEsEmpresa(empresa);
    setIrpfPct(empresa ? 15 : 0);
  }

  const totales = useMemo(() => {
    const base = r2(lineas.reduce((s, l) => s + (Number(l.base) || 0), 0));
    const iva = r2(base * (ivaPct / 100));
    const irpf = r2(base * (irpfPct / 100));
    return { base, iva, irpf, total: r2(base + iva - irpf) };
  }, [lineas, ivaPct, irpfPct]);

  async function generar() {
    setError("");
    if (!numero.trim()) return setError("Falta el número de factura.");
    if (!cNombre.trim()) return setError("Falta el nombre del cliente.");
    if (!lineas.some((l) => l.descripcion.trim() || l.base)) return setError("Añade al menos una línea con importe.");
    const pago = pagos.find((p) => p.origen_id === pagoSel);
    setGenerando(true);
    try {
      const res = await fetch("/api/admin/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: numero.trim(),
          cliente_id: clienteId || null,
          origen: pago?.origen ?? "manual",
          origen_id: pago?.origen_id ?? null,
          fecha,
          concepto,
          cliente_nombre: cNombre,
          cliente_nif: cNif || null,
          cliente_direccion: cDir || null,
          cliente_cp_ciudad: cCiudad || null,
          cliente_telefono: cTel || null,
          es_empresa: esEmpresa,
          iva_pct: ivaPct,
          irpf_pct: irpfPct,
          lineas: lineas.map((l) => ({ descripcion: l.descripcion, base: Number(l.base) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(`/api/admin/facturas/${data.id}`, "_blank");
      cargarFacturas();
      if (clienteId) seleccionarCliente(clienteId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGenerando(false);
    }
  }

  async function borrarFactura(id: string) {
    if (!confirm("¿Eliminar esta factura?")) return;
    await fetch(`/api/admin/facturas/${id}`, { method: "DELETE" });
    cargarFacturas();
  }

  async function abrirPendientes() {
    setVerPendientes(true);
    setCargandoPendientes(true);
    try {
      const res = await fetch("/api/admin/facturas/pendientes-todos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPendientes(data.pagos || []);
      setBulkModal((prev) => prev ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargandoPendientes(false);
    }
  }

  function togglePendiente(key: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const pendientesSinFacturar = useMemo(() => pendientes.filter((p) => !p.ya_facturado), [pendientes]);

  function toggleTodos() {
    const todos = pendientesSinFacturar.map((p) => `${p.origen}:${p.origen_id}`);
    if (todos.every((k) => seleccionados.has(k)) && todos.length > 0) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(todos));
    }
  }

  async function abrirBulkModal() {
    if (seleccionados.size === 0) return;
    const res = await fetch("/api/admin/facturas/pendientes-todos");
    const data = await res.json();
    setBulkModal({ numero: data.numeroSugerido || "", generando: false, error: "", resultado: null });
  }

  async function ejecutarBulk() {
    if (!bulkModal) return;
    if (!bulkModal.numero.trim()) { setBulkModal({ ...bulkModal, error: "Falta el número inicial." }); return; }
    const pagosSel = pendientesSinFacturar
      .filter((p) => seleccionados.has(`${p.origen}:${p.origen_id}`))
      .map((p) => ({ origen: p.origen, origen_id: p.origen_id, cliente_id: p.cliente_id }));
    setBulkModal({ ...bulkModal, generando: true, error: "" });
    try {
      const res = await fetch("/api/admin/facturas/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagos: pagosSel, numero_inicial: bulkModal.numero.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setBulkModal({ ...bulkModal, generando: false, error: data.error || "Error" }); return; }
      setBulkModal({ ...bulkModal, generando: false, error: "", resultado: { generadas: data.generadas || [], errores: data.errores || [] } });
      setSeleccionados(new Set());
      cargarFacturas();
      // Refresca la lista de pendientes (los recién facturados se marcarán como ya_facturado)
      const r2 = await fetch("/api/admin/facturas/pendientes-todos");
      const d2 = await r2.json();
      setPendientes(d2.pagos || []);
    } catch (e) {
      setBulkModal({ ...bulkModal, generando: false, error: e instanceof Error ? e.message : "Error" });
    }
  }

  const previsualizacionNumeros = useMemo(() => {
    if (!bulkModal) return [] as string[];
    const n = seleccionados.size;
    const out: string[] = [];
    let cur = bulkModal.numero.trim();
    for (let i = 0; i < Math.min(n, 5); i++) { out.push(cur); cur = sugerirSiguienteNumero(cur); }
    if (n > 5) out.push(`… hasta ${sugerirSiguienteNumero(out[out.length - 1])} tras ${n - 5} más`);
    return out;
  }, [bulkModal, seleccionados.size]);

  const faltanDatos = !cNif || !cDir;

  return (
    <div>
      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "end", justifyContent: "space-between", flexWrap: "wrap" }}>
          <label style={{ ...label, flex: 1, minWidth: 220 }}>
            Cliente
            <select style={input} value={clienteId} onChange={(e) => seleccionarCliente(e.target.value)}>
              <option value="">Selecciona un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellidos ?? ""}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-ghost" onClick={() => verPendientes ? setVerPendientes(false) : abrirPendientes()}>
            {verPendientes ? "Ocultar pendientes" : "Ver pendientes de todos"}
          </button>
        </div>
      </div>

      {verPendientes && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
            <strong>Pagos pendientes de facturar ({pendientesSinFacturar.length})</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={toggleTodos} disabled={pendientesSinFacturar.length === 0}>
                {pendientesSinFacturar.length > 0 && pendientesSinFacturar.every((p) => seleccionados.has(`${p.origen}:${p.origen_id}`)) ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
              <button type="button" className="btn-primary" onClick={abrirBulkModal} disabled={seleccionados.size === 0}>
                Generar {seleccionados.size || ""} factura{seleccionados.size === 1 ? "" : "s"}
              </button>
            </div>
          </div>
          {cargandoPendientes && <p>Cargando…</p>}
          {!cargandoPendientes && pendientesSinFacturar.length === 0 && <p style={{ color: "#57534e" }}>Sin pagos pendientes. Todos los cobros están facturados.</p>}
          {pendientesSinFacturar.map((p) => {
            const key = `${p.origen}:${p.origen_id}`;
            const faltaNif = !p.cliente_nif;
            return (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0ece6", cursor: faltaNif ? "not-allowed" : "pointer", opacity: faltaNif ? 0.55 : 1 }}>
                <input type="checkbox" checked={seleccionados.has(key)} disabled={faltaNif} onChange={() => togglePendiente(key)} />
                <span style={{ flex: 1 }}>
                  <b>{p.cliente_nombre}</b>
                  <span style={{ opacity: 0.6, marginLeft: 8, fontSize: 12 }}>{p.cliente_es_empresa ? "empresa" : "cliente"}</span>
                  <span style={{ marginLeft: 8, padding: "2px 8px", background: p.cobrado ? "#d1fae5" : "#fef3c7", color: p.cobrado ? "#065f46" : "#92400e", borderRadius: 4, fontSize: 11 }}>
                    {p.cobrado ? "Cobrado" : "Pendiente de cobro"}
                  </span>
                  {faltaNif && <span style={{ marginLeft: 8, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11 }}>Falta NIF/CIF</span>}
                  <br />
                  <span style={{ fontSize: 12, color: "#57534e" }}>{p.concepto} · {p.fecha}</span>
                </span>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{euro(p.base)} <span style={{ fontSize: 11, color: "#57534e", fontWeight: 400 }}>base</span></span>
              </label>
            );
          })}
        </div>
      )}

      {bulkModal && (
        <div onClick={() => !bulkModal.generando && setBulkModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 480, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            {!bulkModal.resultado ? (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>Generar {seleccionados.size} factura{seleccionados.size === 1 ? "" : "s"}</h3>
                <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: "#57534e" }}>
                  Confirma el número inicial. Se usará para la primera factura e irá incrementando (los que ya has emitido manualmente deberían quedar antes de este número).
                </p>
                <label style={{ ...label, display: "block", marginBottom: 12 }}>
                  Nº inicial
                  <input style={input} autoFocus value={bulkModal.numero} onChange={(e) => setBulkModal({ ...bulkModal, numero: e.target.value })} />
                </label>
                {previsualizacionNumeros.length > 0 && (
                  <div style={{ background: "#fff4ec", borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>Secuencia que se generará:</strong>
                    {previsualizacionNumeros.join(" · ")}
                  </div>
                )}
                {bulkModal.error && <p style={{ color: "#dc2626", marginTop: 0, marginBottom: 12, fontSize: 13 }}>{bulkModal.error}</p>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn-ghost" disabled={bulkModal.generando} onClick={() => setBulkModal(null)}>Cancelar</button>
                  <button type="button" className="btn-primary" disabled={bulkModal.generando} onClick={ejecutarBulk}>
                    {bulkModal.generando ? "Generando…" : `Generar ${seleccionados.size}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 10 }}>Resultado</h3>
                {bulkModal.resultado.generadas.length > 0 && (
                  <>
                    <strong style={{ display: "block", marginBottom: 6 }}>Generadas ({bulkModal.resultado.generadas.length})</strong>
                    {bulkModal.resultado.generadas.map((g) => (
                      <div key={g.factura_id} style={{ padding: "6px 0", borderBottom: "1px solid #f0ece6", display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontWeight: 700, width: 90 }}>{g.numero}</span>
                        <span style={{ flex: 1, fontSize: 13 }}>{g.cliente_nombre}</span>
                        <a className="btn-ghost" href={`/api/admin/facturas/${g.factura_id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>PDF</a>
                      </div>
                    ))}
                  </>
                )}
                {bulkModal.resultado.errores.length > 0 && (
                  <>
                    <strong style={{ display: "block", marginTop: 14, marginBottom: 6, color: "#c2410c" }}>Errores ({bulkModal.resultado.errores.length})</strong>
                    {bulkModal.resultado.errores.map((e, i) => (
                      <div key={i} style={{ padding: "4px 0", fontSize: 12, color: "#57534e" }}>{e.error} <span style={{ opacity: 0.5 }}>({e.origen}:{e.origen_id.slice(0, 8)})</span></div>
                    ))}
                  </>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                  <button type="button" className="btn-primary" onClick={() => setBulkModal(null)}>Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {cargando && <p>Cargando…</p>}

      {ficha && (
        <>
          <div style={card}>
            <strong style={{ display: "block", marginBottom: 10 }}>Pagos pendientes</strong>
            {pagos.length === 0 && <p style={{ color: "#57534e" }}>Sin cobros pendientes. Puedes facturar manualmente rellenando la línea de abajo.</p>}
            {pagos.map((p) => (
              <label key={p.origen_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0ece6", cursor: "pointer" }}>
                <input type="radio" name="pago" checked={pagoSel === p.origen_id} onChange={() => elegirPago(p)} />
                <span style={{ flex: 1 }}>
                  {p.concepto}
                  <span style={{ marginLeft: 8, padding: "2px 8px", background: p.cobrado ? "#d1fae5" : "#fef3c7", color: p.cobrado ? "#065f46" : "#92400e", borderRadius: 4, fontSize: 11 }}>
                    {p.cobrado ? "Cobrado" : "Pendiente de cobro"}
                  </span>
                </span>
                <span style={{ fontWeight: 700 }}>{euro(p.base)} <span style={{ fontSize: 11, color: "#57534e" }}>base</span></span>
                {p.ya_facturado && <span style={{ fontSize: 11, color: "#c2410c", fontWeight: 700 }}>ya facturado</span>}
              </label>
            ))}
          </div>

          <div style={card}>
            <strong style={{ display: "block", marginBottom: 12 }}>Datos de la factura</strong>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button type="button" onClick={() => cambiarModelo(false)} style={{ ...input, cursor: "pointer", fontWeight: 700, background: !esEmpresa ? "#ea6a12" : "#fff", color: !esEmpresa ? "#fff" : "#1c1917", borderColor: !esEmpresa ? "#ea6a12" : "#d6cfc6" }}>Cliente (sin IRPF)</button>
              <button type="button" onClick={() => cambiarModelo(true)} style={{ ...input, cursor: "pointer", fontWeight: 700, background: esEmpresa ? "#ea6a12" : "#fff", color: esEmpresa ? "#fff" : "#1c1917", borderColor: esEmpresa ? "#ea6a12" : "#d6cfc6" }}>Empresa (IRPF 15%)</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <label style={label}>Nº de factura<input style={input} value={numero} onChange={(e) => setNumero(e.target.value)} /></label>
              <label style={label}>Fecha<input style={input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
              <label style={label}>Concepto<input style={input} value={concepto} onChange={(e) => setConcepto(e.target.value)} /></label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
              <label style={label}>Cliente — nombre<input style={input} value={cNombre} onChange={(e) => setCNombre(e.target.value)} /></label>
              <label style={label}>DNI / NIF / CIF<input style={input} value={cNif} onChange={(e) => setCNif(e.target.value)} /></label>
              <label style={label}>Dirección<input style={input} value={cDir} onChange={(e) => setCDir(e.target.value)} /></label>
              <label style={label}>CP y ciudad<input style={input} value={cCiudad} onChange={(e) => setCCiudad(e.target.value)} /></label>
              <label style={label}>Teléfono<input style={input} value={cTel} onChange={(e) => setCTel(e.target.value)} /></label>
            </div>

            {faltanDatos && (
              <p style={{ fontSize: 12, color: "#c2410c", marginBottom: 12 }}>
                Faltan datos fiscales del cliente (NIF o dirección). Rellénalos aquí; se guardan en esta factura.
              </p>
            )}

            <strong style={{ display: "block", marginBottom: 8, fontSize: 12 }}>Líneas</strong>
            {lineas.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <input style={{ ...input, flex: 1 }} placeholder="Descripción" value={l.descripcion} onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))} />
                <input style={{ ...input, width: 120 }} inputMode="decimal" placeholder="Base €" value={l.base || ""} onChange={(e) => setLineas(lineas.map((x, j) => (j === i ? { ...x, base: Number(e.target.value.replace(",", ".")) || 0 } : x)))} />
                {lineas.length > 1 && <button type="button" onClick={() => setLineas(lineas.filter((_, j) => j !== i))} style={{ ...input, cursor: "pointer", width: 40 }}>×</button>}
              </div>
            ))}
            <button type="button" onClick={() => setLineas([...lineas, { descripcion: "", base: 0 }])} style={{ ...input, cursor: "pointer", border: "1px dashed #d6cfc6", color: "#57534e", background: "none", marginBottom: 14 }}>+ Añadir línea</button>

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <label style={label}>IVA %<input style={{ ...input, width: 80 }} type="number" value={ivaPct} onChange={(e) => setIvaPct(Number(e.target.value) || 0)} /></label>
              <label style={label}>IRPF %<input style={{ ...input, width: 80 }} type="number" value={irpfPct} onChange={(e) => setIrpfPct(Number(e.target.value) || 0)} /></label>
            </div>

            <div style={{ background: "#fff4ec", borderRadius: 8, padding: 12, marginBottom: 14, maxWidth: 320 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>Base</span><strong>{euro(totales.base)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>IVA ({ivaPct}%)</span><strong>{euro(totales.iva)}</strong></div>
              {irpfPct > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#57534e" }}><span>IRPF ({irpfPct}%)</span><strong>− {euro(totales.irpf)}</strong></div>}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", borderTop: "1px solid #e7e2db", marginTop: 4, fontSize: 16 }}><span style={{ fontWeight: 700, color: "#c2410c" }}>TOTAL</span><strong>{euro(totales.total)}</strong></div>
            </div>

            {error && <p style={{ color: "#c2410c", marginBottom: 10 }}>{error}</p>}
            <button type="button" className="btn-primary" onClick={generar} disabled={generando}>
              {generando ? "Generando…" : "Generar factura"}
            </button>
          </div>
        </>
      )}

      <div style={card}>
        <strong style={{ display: "block", marginBottom: 10 }}>Facturas recientes</strong>
        {facturas.length === 0 && <p style={{ color: "#57534e" }}>Todavía no hay facturas.</p>}
        {facturas.map((f) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0ece6" }}>
            <span style={{ fontWeight: 700, width: 90 }}>{f.numero}</span>
            <span style={{ flex: 1 }}>{f.cliente_nombre} · {f.concepto}</span>
            <span style={{ fontSize: 11, color: "#57534e" }}>{f.es_empresa ? "Empresa" : "Cliente"}</span>
            <span style={{ fontWeight: 700 }}>{euro(f.total)}</span>
            <a className="btn-ghost" href={`/api/admin/facturas/${f.id}`} target="_blank" rel="noreferrer">PDF</a>
            <button type="button" onClick={() => borrarFactura(f.id)} style={{ ...input, cursor: "pointer", width: 40 }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
