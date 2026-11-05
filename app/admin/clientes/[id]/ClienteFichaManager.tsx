"use client";

import React, { useCallback, useEffect, useState } from "react";

type ClienteDocumento = {
  id: string;
  nombre: string;
  categoria: string;
  content_type: string | null;
  solo_clientes: boolean;
  created_at: string;
};

type FacturaEmitida = {
  id: string;
  numero: string;
  fecha: string;
  concepto: string;
  total: number;
};

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "factura", label: "Factura" },
  { value: "seguro", label: "Seguro" },
  { value: "dni", label: "DNI / NIE" },
  { value: "contrato", label: "Contrato" },
  { value: "nomina", label: "Nómina / Solvencia" },
  { value: "otro", label: "Otro" },
];
const labelCat = (v: string) => CATEGORIAS.find((c) => c.value === v)?.label || "Otro";
const fmtEur = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export default function ClienteFichaManager({ clienteId, esAdmin }: { clienteId: string; esAdmin: boolean }) {
  const [documentos, setDocumentos] = useState<ClienteDocumento[]>([]);
  const [facturas, setFacturas] = useState<FacturaEmitida[]>([]);
  const [categoria, setCategoria] = useState("otro");
  const [nombre, setNombre] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const [docs, facs] = await Promise.all([
      fetch(`/api/admin/clientes/${clienteId}/documentos`).then((r) => r.json()).catch(() => []),
      fetch(`/api/admin/clientes/${clienteId}/facturas`).then((r) => r.json()).catch(() => []),
    ]);
    setDocumentos(Array.isArray(docs) ? docs : []);
    setFacturas(Array.isArray(facs) ? facs : []);
  }, [clienteId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) { setError("Elige un archivo."); return; }
    setError("");
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categoria", categoria);
      if (nombre.trim()) fd.append("nombre", nombre.trim());
      const res = await fetch(`/api/admin/clientes/${clienteId}/documentos`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ error: "" }));
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setNombre("");
      if (input) input.value = "";
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo subir el documento");
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminar(docId: string) {
    if (!confirm("¿Eliminar este documento de forma permanente?")) return;
    await fetch(`/api/admin/clientes/${clienteId}/documentos/${docId}`, { method: "DELETE" });
    await cargar();
  }

  async function toggleVisibilidad(doc: ClienteDocumento) {
    const res = await fetch(`/api/admin/clientes/${clienteId}/documentos/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solo_clientes: !doc.solo_clientes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "" }));
      setError(data?.error || "No se pudo cambiar la visibilidad");
      return;
    }
    setDocumentos((prev) => prev.map((d) => (d.id === doc.id ? { ...d, solo_clientes: !d.solo_clientes } : d)));
  }

  const docFacturas = documentos.filter((d) => d.categoria === "factura");
  const docOtros = documentos.filter((d) => d.categoria !== "factura");

  const Item = (d: ClienteDocumento) => (
    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{d.nombre}</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {labelCat(d.categoria)} · {new Date(d.created_at).toLocaleDateString("es-ES")}
          {d.solo_clientes && (
            <span style={{ marginLeft: 8, padding: "1px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 999, fontSize: 11 }}>
              Solo Clientes
            </span>
          )}
        </div>
      </div>
      <a href={`/api/admin/clientes/${clienteId}/documentos/${d.id}`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }}>Abrir</a>
      <a href={`/api/admin/clientes/${clienteId}/documentos/${d.id}?download=1`} className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }}>Descargar</a>
      {esAdmin && (
        <button type="button" onClick={() => toggleVisibilidad(d)} className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }}>
          {d.solo_clientes ? "Mostrar en Contabilidad" : "Ocultar de Contabilidad"}
        </button>
      )}
      <button type="button" onClick={() => eliminar(d.id)} className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px", color: "#dc2626" }}>Eliminar</button>
    </div>
  );

  return (
    <>
      <div className="analytics-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Subir documento</h3>
        <form onSubmit={subir} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (opcional)"
            style={{ flex: "1 1 200px", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8 }}
          />
          <input name="file" type="file" accept="application/pdf,image/*" style={{ flex: "1 1 220px" }} />
          <button type="submit" disabled={subiendo} className="btn-primary" style={{ opacity: subiendo ? 0.6 : 1 }}>
            {subiendo ? "Subiendo…" : "Subir"}
          </button>
        </form>
        <p style={{ fontSize: 12, opacity: 0.6, margin: "10px 0 0" }}>PDF o imágenes (máx. 20 MB).</p>
        {error && (
          <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: 13 }}>{error}</div>
        )}
      </div>

      <div className="analytics-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Facturas (documentos)</h3>
        {docFacturas.length ? docFacturas.map(Item) : <p className="admin-empty" style={{ marginTop: 4 }}>Sin facturas subidas.</p>}
      </div>

      <div className="analytics-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Otros documentos</h3>
        {docOtros.length ? docOtros.map(Item) : <p className="admin-empty" style={{ marginTop: 4 }}>Sin documentos.</p>}
      </div>

      <div className="analytics-card">
        <h3 style={{ marginTop: 0 }}>Facturas emitidas</h3>
        {facturas.length ? (
          <div>
            {facturas.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>Factura {f.numero} · {fmtEur(f.total)}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{f.concepto} · {new Date(f.fecha).toLocaleDateString("es-ES")}</div>
                </div>
                <a href={`/api/admin/clientes/${clienteId}/facturas/${f.id}`} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "3px 10px" }}>Ver factura</a>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-empty" style={{ marginTop: 4 }}>Sin facturas emitidas.</p>
        )}
      </div>
    </>
  );
}
