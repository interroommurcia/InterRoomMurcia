"use client";

import { useState } from "react";
import { FONT, Field, inputStyle } from "./shared";

export function PublicarBloque({
  propiedadId,
  habitacionId,
  sugerencias,
  label,
}: {
  propiedadId: string;
  habitacionId: string | null;
  sugerencias: { titulo: string; precio: number; direccion: string; descripcion: string };
  label: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [zona, setZona] = useState<"ucam" | "umu" | "upct">("umu");
  const [titulo, setTitulo] = useState(sugerencias.titulo);
  const [precio, setPrecio] = useState(sugerencias.precio || 0);
  const [barrio, setBarrio] = useState(sugerencias.direccion);
  const [descripcion, setDescripcion] = useState(sugerencias.descripcion || "");
  const [publicando, setPublicando] = useState(false);
  const [resultado, setResultado] = useState<{ url: string } | null>(null);

  async function publicar() {
    if (!titulo || !barrio || !descripcion || !precio) {
      alert("Faltan datos: título, barrio, descripción y precio son obligatorios.");
      return;
    }
    setPublicando(true);
    const res = await fetch(`/api/admin/propiedades/${propiedadId}/publicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitacion_id: habitacionId, zona, titulo, barrio, precio_mes: precio, descripcion }),
    });
    const data = await res.json();
    setPublicando(false);
    if (data.ok) setResultado({ url: data.url });
    else alert(data.error || "No se pudo publicar");
  }

  if (resultado) {
    return (
      <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "#d1fae5", color: "#065f46", fontSize: 13 }}>
        ✓ Publicado. <a href={resultado.url} target="_blank" rel="noopener noreferrer" style={{ color: "#047857", fontWeight: 600 }}>Ver en catálogo →</a>{" "}
        <a href="/admin/pisos" style={{ color: "#047857", marginLeft: 8 }}>Editar en catálogo</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--orange)",
          background: abierto ? "var(--orange-light)" : "#fff",
          color: "var(--orange)",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: FONT,
        }}
      >
        {abierto ? "Cancelar" : label}
      </button>
      {abierto && (
        <div style={{ marginTop: 10, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            Se creará un anuncio en el catálogo con la primera foto disponible como portada. Podrás ajustar detalles después en <b>/admin/pisos</b>.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <Field label="Zona (campus)">
              <select value={zona} onChange={(e) => setZona(e.target.value as "ucam" | "umu" | "upct")} style={inputStyle}>
                <option value="ucam">UCAM</option>
                <option value="umu">UMU</option>
                <option value="upct">UPCT</option>
              </select>
            </Field>
            <Field label="Título del anuncio">
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Barrio">
              <input value={barrio} onChange={(e) => setBarrio(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Precio/mes (€)">
              <input type="number" min={0} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Descripción">
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} placeholder="Describe la propiedad para el anuncio…" />
            </Field>
          </div>
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button type="button" disabled={publicando} onClick={publicar} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--orange)", color: "#fff", border: "none", cursor: publicando ? "wait" : "pointer", fontSize: 14, fontWeight: 500, fontFamily: FONT }}>
              {publicando ? "Publicando…" : "Publicar en catálogo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
