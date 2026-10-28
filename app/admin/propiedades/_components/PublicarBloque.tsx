"use client";

import { useState } from "react";
import { FONT, Field, inputStyle } from "./shared";
import type { Habitacion, Media } from "./shared";

type HabForm = {
  id: string;
  nombre: string;
  precio: number;
  fotoIds: string[];
};

export function PublicarBloque({
  propiedadId,
  habitacionId,
  sugerencias,
  label,
  tipoProp,
  habitaciones,
  media,
  numHabitaciones,
  numBanos,
}: {
  propiedadId: string;
  habitacionId: string | null;
  sugerencias: { titulo: string; precio: number; direccion: string; descripcion: string };
  label: string;
  tipoProp?: string;
  habitaciones?: Habitacion[];
  media?: Media[];
  numHabitaciones?: number;
  numBanos?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [categoria, setCategoria] = useState<"alquiler" | "compraventa">(tipoProp === "venta_activo" ? "compraventa" : "alquiler");
  const [modoAlquiler, setModoAlquiler] = useState<"completo" | "habitaciones">("completo");
  const [zona, setZona] = useState("");
  const [titulo, setTitulo] = useState(sugerencias.titulo);
  const [precio, setPrecio] = useState(sugerencias.precio || 0);
  const [barrio, setBarrio] = useState(sugerencias.direccion);
  const [descripcion, setDescripcion] = useState(sugerencias.descripcion || "");
  const [esProximamente, setEsProximamente] = useState(false);
  const [incluirFotosHab, setIncluirFotosHab] = useState(true);
  const [publicando, setPublicando] = useState(false);
  const [generandoDesc, setGenerandoDesc] = useState(false);
  const [resultado, setResultado] = useState<{ url: string } | { urls: string[] } | null>(null);

  const [habForms, setHabForms] = useState<HabForm[]>(() =>
    (habitaciones ?? []).map((h) => ({
      id: h.id,
      nombre: h.nombre,
      precio: h.precio ?? 0,
      fotoIds: (media ?? []).filter((m) => m.habitacion_id === h.id && m.tipo === "foto").map((m) => m.id),
    }))
  );

  const fotosGenerales = (media ?? []).filter((m) => m.tipo === "foto" && !m.habitacion_id);
  const todasFotos = (media ?? []).filter((m) => m.tipo === "foto");
  const fotosHabitaciones = (media ?? []).filter((m) => m.tipo === "foto" && m.habitacion_id);

  function updateHab(idx: number, patch: Partial<HabForm>) {
    setHabForms((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function toggleFoto(habIdx: number, fotoId: string) {
    setHabForms((prev) =>
      prev.map((h, i) => {
        if (i !== habIdx) return h;
        const has = h.fotoIds.includes(fotoId);
        return { ...h, fotoIds: has ? h.fotoIds.filter((id) => id !== fotoId) : [...h.fotoIds, fotoId] };
      })
    );
  }

  async function generarDescripcion() {
    setGenerandoDesc(true);
    try {
      const res = await fetch(`/api/admin/propiedades/${propiedadId}/descripcion-ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          barrio,
          precio,
          categoria,
          tipo_alquiler: modoAlquiler === "habitaciones" ? "habitacion" : "completo",
          habitacion_id: habitacionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "No se pudo generar la descripción"); return; }
      setDescripcion(data.descripcion);
    } catch (e) {
      alert("Error generando: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGenerandoDesc(false);
    }
  }

  async function publicar() {
    if (!titulo || !barrio || !descripcion) {
      alert("Faltan datos: título, barrio y descripción son obligatorios.");
      return;
    }

    if (categoria === "alquiler" && modoAlquiler === "habitaciones") {
      if (habForms.length === 0) {
        alert("No hay habitaciones definidas. Añade habitaciones a la propiedad primero.");
        return;
      }
      const sinPrecio = habForms.filter((h) => !h.precio);
      if (sinPrecio.length > 0) {
        alert(`Falta precio en: ${sinPrecio.map((h) => h.nombre).join(", ")}`);
        return;
      }

      setPublicando(true);
      const urls: string[] = [];
      for (const hf of habForms) {
        const res = await fetch(`/api/admin/propiedades/${propiedadId}/publicar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            habitacion_id: hf.id,
            zona,
            titulo: `${hf.nombre} en ${titulo}`,
            barrio,
            precio_mes: hf.precio,
            descripcion,
            categoria,
            tipo_alquiler: "habitacion",
            foto_ids: hf.fotoIds.length > 0 ? hf.fotoIds : undefined,
            estado: esProximamente ? "proximamente" : "disponible",
            num_habitaciones: numHabitaciones ?? null,
            num_banos: numBanos ?? null,
          }),
        });
        const data = await res.json();
        if (data.ok) urls.push(data.url);
        else {
          alert(`Error publicando ${hf.nombre}: ${data.error || "Error"}`);
          setPublicando(false);
          return;
        }
      }
      setPublicando(false);
      setResultado({ urls });
      return;
    }

    if (!precio) {
      alert("Falta el precio.");
      return;
    }

    setPublicando(true);
    const res = await fetch(`/api/admin/propiedades/${propiedadId}/publicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitacion_id: habitacionId, zona, titulo, barrio, precio_mes: precio, descripcion, categoria, estado: esProximamente ? "proximamente" : "disponible", num_habitaciones: numHabitaciones ?? null, num_banos: numBanos ?? null, incluir_complementarias: incluirFotosHab }),
    });
    const data = await res.json();
    setPublicando(false);
    if (data.ok) setResultado({ url: data.url });
    else alert(data.error || "No se pudo publicar");
  }

  if (resultado) {
    if ("urls" in resultado) {
      return (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "#d1fae5", color: "#065f46", fontSize: 13 }}>
          ✓ {resultado.urls.length} habitaciones publicadas.{" "}
          <a href="/admin/pisos" style={{ color: "#047857", fontWeight: 600 }}>Ver en catálogo →</a>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: "#d1fae5", color: "#065f46", fontSize: 13 }}>
        ✓ Publicado. <a href={resultado.url} target="_blank" rel="noopener noreferrer" style={{ color: "#047857", fontWeight: 600 }}>Ver en catálogo →</a>{" "}
        <a href="/admin/pisos" style={{ color: "#047857", marginLeft: 8 }}>Editar en catálogo</a>
      </div>
    );
  }

  const showModoAlquiler = categoria === "alquiler" && !habitacionId && (habitaciones ?? []).length > 0;

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
            <Field label="Categoría">
              <select value={categoria} onChange={(e) => setCategoria(e.target.value as "alquiler" | "compraventa")} style={inputStyle}>
                <option value="alquiler">Alquiler</option>
                <option value="compraventa">Compraventa</option>
              </select>
            </Field>
            {showModoAlquiler && (
              <Field label="Modo de alquiler">
                <select value={modoAlquiler} onChange={(e) => setModoAlquiler(e.target.value as "completo" | "habitaciones")} style={inputStyle}>
                  <option value="completo">Piso completo</option>
                  <option value="habitaciones">Por habitaciones</option>
                </select>
              </Field>
            )}
            <Field label="Zona (opcional)">
              <select value={zona} onChange={(e) => setZona(e.target.value)} style={inputStyle}>
                <option value="">— Sin zona —</option>
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
            {!(categoria === "alquiler" && modoAlquiler === "habitaciones" && showModoAlquiler) && (
              <Field label={categoria === "compraventa" ? "Precio (€)" : "Precio/mes (€)"}>
                <input type="number" min={0} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={inputStyle} />
              </Field>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Descripción</label>
              <button
                type="button"
                onClick={generarDescripcion}
                disabled={generandoDesc}
                style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--orange)", background: generandoDesc ? "#fff7ed" : "#fff", color: "var(--orange)", cursor: generandoDesc ? "wait" : "pointer", fontSize: 12, fontWeight: 600, fontFamily: FONT }}
              >
                {generandoDesc ? "Generando…" : (descripcion.trim() ? "✨ Regenerar con IA" : "✨ Generar con IA")}
              </button>
            </div>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical", minHeight: 120 }} placeholder="Escribe la descripción o pulsa 'Generar con IA'…" />
          </div>

          {categoria === "alquiler" && modoAlquiler === "habitaciones" && showModoAlquiler && (
            <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Habitaciones y precios</div>
              {habForms.map((hf, idx) => (
                <div key={hf.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginBottom: 8 }}>
                    <Field label="Habitación">
                      <input
                        value={hf.nombre}
                        onChange={(e) => updateHab(idx, { nombre: e.target.value })}
                        style={{ ...inputStyle, minWidth: 120 }}
                      />
                    </Field>
                    <Field label="Precio/mes (€)">
                      <input
                        type="number"
                        min={0}
                        value={hf.precio || ""}
                        onChange={(e) => updateHab(idx, { precio: Number(e.target.value) })}
                        style={{ ...inputStyle, width: 100 }}
                      />
                    </Field>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Fotos para esta habitación (clic para seleccionar/deseleccionar):</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {todasFotos.map((f) => {
                      const selected = hf.fotoIds.includes(f.id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => toggleFoto(idx, f.id)}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 6,
                            overflow: "hidden",
                            cursor: "pointer",
                            border: selected ? "3px solid var(--orange)" : "2px solid #d1d5db",
                            opacity: selected ? 1 : 0.5,
                            position: "relative",
                          }}
                        >
                          <img src={f.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          {selected && (
                            <div style={{ position: "absolute", top: 2, right: 2, background: "var(--orange)", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
                          )}
                        </div>
                      );
                    })}
                    {todasFotos.length === 0 && <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin fotos disponibles</span>}
                  </div>
                </div>
              ))}
              {habForms.length === 0 && (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No hay habitaciones definidas. Añade habitaciones a la propiedad primero.</p>
              )}
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
                Total: {habForms.reduce((s, h) => s + (h.precio || 0), 0)} €/mes
              </div>
            </div>
          )}

          {!(categoria === "alquiler" && modoAlquiler === "habitaciones" && showModoAlquiler) && fotosHabitaciones.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer", marginTop: 12, padding: "8px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <input type="checkbox" checked={incluirFotosHab} onChange={(e) => setIncluirFotosHab(e.target.checked)} />
              Incluir también las <b>fotos de las habitaciones</b> ({fotosHabitaciones.length}) en el anuncio
            </label>
          )}

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", cursor: "pointer" }}>
              <input type="checkbox" checked={esProximamente} onChange={(e) => setEsProximamente(e.target.checked)} />
              Publicar como <b style={{ color: "var(--orange)" }}>Próximamente</b>
            </label>
            <button type="button" disabled={publicando} onClick={publicar} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--orange)", color: "#fff", border: "none", cursor: publicando ? "wait" : "pointer", fontSize: 14, fontWeight: 500, fontFamily: FONT }}>
              {publicando
                ? "Publicando…"
                : categoria === "alquiler" && modoAlquiler === "habitaciones" && showModoAlquiler
                ? `Publicar ${habForms.length} habitaciones`
                : "Publicar en catálogo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
