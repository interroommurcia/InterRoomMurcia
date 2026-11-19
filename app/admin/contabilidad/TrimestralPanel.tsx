"use client";

import { useEffect, useMemo, useState } from "react";

type EmitidaTrim = { tipo: "emitida"; id: string; numero: string; fecha: string; cliente_nombre: string; concepto: string; base: number; iva_importe: number; total: number };
type SubidaTrim = { tipo: "subida"; id: string; fecha: string; concepto: string; importe: number | null; nombre_archivo: string };
type MesTrim = { mes: number; nombre: string; emitidas: EmitidaTrim[]; subidas: SubidaTrim[]; totalBase: number; totalIva: number; totalEmitidas: number; totalSubidas: number };
type TrimestreTrim = { trimestre: number; meses: MesTrim[]; totalBase: number; totalIva: number; totalEmitidas: number; totalSubidas: number };
type TrimestralView = {
  anio: number;
  aniosDisponibles: number[];
  trimestres: TrimestreTrim[];
  totalAnual: { base: number; iva: number; emitidas: number; subidas: number; numEmitidas: number; numSubidas: number };
};

const euro = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + " €";
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e7e2db", borderRadius: 12, padding: 16, marginBottom: 16 };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "#57534e" };
const input: React.CSSProperties = { font: "inherit", fontSize: 14, fontWeight: 500, textTransform: "none", letterSpacing: 0, padding: "8px 10px", border: "1px solid #d6cfc6", borderRadius: 8 };

const TRIM_LABEL = ["1T · Ene-Mar", "2T · Abr-Jun", "3T · Jul-Sep", "4T · Oct-Dic"];

export default function TrimestralPanel() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [data, setData] = useState<TrimestralView | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [subirMes, setSubirMes] = useState<number | null>(null);
  const [subForm, setSubForm] = useState({ fecha: "", concepto: "", importe: "", notas: "", file: null as File | null });
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function cargar(a = anio) {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/facturas/trimestral?anio=${a}`);
      const d = await res.json();
      setData(d?.anio !== undefined ? d : null);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(anio); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [anio]);

  function toggleMes(mes: number) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(mes)) next.delete(mes); else next.add(mes);
      return next;
    });
  }

  const q = busqueda.trim().toLowerCase();
  const coincide = (texto: string) => !q || texto.toLowerCase().includes(q);

  function abrirSubir(mes: number) {
    const mm = String(mes).padStart(2, "0");
    setSubirMes(mes);
    setSubForm({ fecha: `${anio}-${mm}-01`, concepto: "", importe: "", notas: "", file: null });
    setError("");
  }

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    if (!subForm.file) return setError("Añade el archivo (PDF o imagen).");
    if (!subForm.fecha) return setError("Falta la fecha.");
    if (!subForm.concepto.trim()) return setError("Falta el concepto.");
    setSubiendo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", subForm.file);
      fd.append("fecha", subForm.fecha);
      fd.append("concepto", subForm.concepto);
      fd.append("importe", subForm.importe);
      fd.append("notas", subForm.notas);
      const res = await fetch("/api/admin/facturas/subidas", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error");
      setSubirMes(null);
      cargar(anio);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarSubida(id: string) {
    if (!confirm("¿Eliminar esta factura subida?")) return;
    await fetch(`/api/admin/facturas/subidas/${id}`, { method: "DELETE" });
    cargar(anio);
  }

  const mesesConContenido = useMemo(() => {
    if (!data) return 0;
    return data.trimestres.reduce((s, t) => s + t.meses.filter((m) => m.emitidas.length || m.subidas.length).length, 0);
  }, [data]);

  return (
    <div className="articulos-list-section" style={{ marginTop: 20 }}>
      <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Archivo trimestral</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ ...input, minWidth: 180 }} placeholder="Buscar cliente / concepto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select style={input} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {(data?.aniosDisponibles ?? [anio]).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#57534e", marginTop: 0 }}>
        Facturas emitidas <b>marcadas como cobradas</b> + facturas que subas tú, agrupadas por el mes de su fecha. Archivo permanente.
      </p>

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          <Metrica titulo="Base emitida" valor={euro(data.totalAnual.base)} />
          <Metrica titulo="IVA repercutido" valor={euro(data.totalAnual.iva)} />
          <Metrica titulo="Total emitido" valor={euro(data.totalAnual.emitidas)} acento />
          <Metrica titulo="Facturas emitidas" valor={String(data.totalAnual.numEmitidas)} />
          <Metrica titulo="Subidas" valor={`${data.totalAnual.numSubidas} · ${euro(data.totalAnual.subidas)}`} />
        </div>
      )}

      {cargando && <p>Cargando…</p>}
      {!cargando && data && mesesConContenido === 0 && (
        <div style={card}><p style={{ margin: 0, color: "#57534e" }}>Nada archivado en {anio}. Marca facturas como cobradas en el panel Facturas o sube las tuyas con el botón de cada mes.</p></div>
      )}

      {!cargando && data && data.trimestres.map((t) => {
        const tieneAlgo = t.meses.some((m) => m.emitidas.length || m.subidas.length);
        return (
          <div key={t.trimestre} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: tieneAlgo ? 10 : 0, flexWrap: "wrap", gap: 8 }}>
              <strong style={{ fontSize: 15 }}>{TRIM_LABEL[t.trimestre - 1]}</strong>
              <span style={{ fontSize: 13, color: "#57534e" }}>
                Base {euro(t.totalBase)} · IVA {euro(t.totalIva)} · <b style={{ color: "#c2410c" }}>Total {euro(t.totalEmitidas)}</b>
                {t.totalSubidas > 0 && <> · Subidas {euro(t.totalSubidas)}</>}
              </span>
            </div>

            {t.meses.map((m) => {
              const items = m.emitidas.length + m.subidas.length;
              const abierto = abiertos.has(m.mes);
              const emitidasF = m.emitidas.filter((e) => coincide(e.cliente_nombre) || coincide(e.concepto) || coincide(e.numero));
              const subidasF = m.subidas.filter((s) => coincide(s.concepto) || coincide(s.nombre_archivo));
              return (
                <div key={m.mes} style={{ borderTop: "1px solid #f0ece6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
                    <button type="button" onClick={() => toggleMes(m.mes)} style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flex: 1, textAlign: "left" }}>
                      <span style={{ display: "inline-block", width: 14, color: "#a8a29e", transform: abierto ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                      {m.nombre}
                      <span style={{ fontWeight: 400, color: "#a8a29e", fontSize: 12 }}>{items === 0 ? "vacío" : `${items} doc${items === 1 ? "" : "s"}`}</span>
                    </button>
                    <span style={{ fontSize: 12, color: "#57534e" }}>{m.totalEmitidas > 0 && <>Total {euro(m.totalEmitidas)}</>}</span>
                    <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => abrirSubir(m.mes)}>+ Subir</button>
                  </div>

                  {abierto && (
                    <div style={{ paddingBottom: 10 }}>
                      {items === 0 && <p style={{ color: "#a8a29e", fontSize: 13, margin: "0 0 8px 22px" }}>Sin facturas este mes.</p>}
                      {emitidasF.map((e) => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 6px 22px", borderBottom: "1px solid #f7f4f0", fontSize: 13 }}>
                          <span style={{ fontWeight: 700, width: 80 }}>{e.numero}</span>
                          <span style={{ flex: 1 }}>{e.cliente_nombre} <span style={{ color: "#a8a29e" }}>· {e.concepto}</span></span>
                          <span style={{ color: "#57534e", width: 90, textAlign: "right" }}>{e.fecha}</span>
                          <span style={{ fontWeight: 700, width: 100, textAlign: "right" }}>{euro(e.total)}</span>
                          <a className="btn-ghost" style={{ fontSize: 12 }} href={`/api/admin/facturas/${e.id}`} target="_blank" rel="noreferrer">PDF</a>
                        </div>
                      ))}
                      {subidasF.map((s) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 6px 22px", borderBottom: "1px solid #f7f4f0", fontSize: 13 }}>
                          <span style={{ width: 80, fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>SUBIDA</span>
                          <span style={{ flex: 1 }}>{s.concepto} <span style={{ color: "#a8a29e" }}>· {s.nombre_archivo}</span></span>
                          <span style={{ color: "#57534e", width: 90, textAlign: "right" }}>{s.fecha}</span>
                          <span style={{ fontWeight: 700, width: 100, textAlign: "right" }}>{s.importe != null ? euro(s.importe) : "—"}</span>
                          <a className="btn-ghost" style={{ fontSize: 12 }} href={`/api/admin/facturas/subidas/${s.id}`} target="_blank" rel="noreferrer">Ver</a>
                          <button type="button" onClick={() => borrarSubida(s.id)} style={{ ...input, cursor: "pointer", width: 34, padding: "4px 0" }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {subirMes !== null && (
        <div onClick={() => !subiendo && setSubirMes(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={subir} style={{ background: "#fff", padding: 20, borderRadius: 12, maxWidth: 460, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Subir factura</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={label}>Fecha<input style={input} type="date" value={subForm.fecha} onChange={(e) => setSubForm({ ...subForm, fecha: e.target.value })} /></label>
              <label style={label}>Concepto<input style={input} value={subForm.concepto} onChange={(e) => setSubForm({ ...subForm, concepto: e.target.value })} placeholder="Ej. Alquiler oficina, Suministros…" /></label>
              <label style={label}>Importe € (opcional)<input style={input} inputMode="decimal" value={subForm.importe} onChange={(e) => setSubForm({ ...subForm, importe: e.target.value })} /></label>
              <label style={label}>Notas (opcional)<input style={input} value={subForm.notas} onChange={(e) => setSubForm({ ...subForm, notas: e.target.value })} /></label>
              <label style={label}>Archivo (PDF o imagen)<input style={{ ...input, padding: 6 }} type="file" accept="application/pdf,image/*" onChange={(e) => setSubForm({ ...subForm, file: e.target.files?.[0] ?? null })} /></label>
            </div>
            {error && <p style={{ color: "#c2410c", marginBottom: 10 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button type="button" className="btn-ghost" disabled={subiendo} onClick={() => setSubirMes(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={subiendo}>{subiendo ? "Subiendo…" : "Subir"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metrica({ titulo, valor, acento }: { titulo: string; valor: string; acento?: boolean }) {
  return (
    <div style={{ background: acento ? "#fff4ec" : "#faf8f5", border: "1px solid #e7e2db", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "#a8a29e", fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: acento ? "#c2410c" : "#1c1917", marginTop: 2 }}>{valor}</div>
    </div>
  );
}
