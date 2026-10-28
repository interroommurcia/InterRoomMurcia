"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { PREFIJOS, validarTelefono } from "../lib/telefono";

type Props = {
  pisoId: string;
  pisoTitulo: string;
  pisoCategoria: string;
  numHabitaciones?: number | null;
  variant?: "card" | "ficha";
};

export default function QuieroAlquilar({ pisoId, pisoTitulo, pisoCategoria, numHabitaciones, variant = "ficha" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [tipo, setTipo] = useState<"individual" | "grupo">("individual");
  const [grupoTam, setGrupoTam] = useState<number>(numHabitaciones && numHabitaciones > 1 ? numHabitaciones : 2);
  const [nombre, setNombre] = useState("");
  const [prefijo, setPrefijo] = useState("+34");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // El botón Enviar solo se activa con un teléfono válido para el prefijo.
  const telValido = (() => {
    const d = telefono.replace(/\D/g, "");
    return d.length > 0 && !validarTelefono(prefijo, d);
  })();

  function abrir(e: React.MouseEvent) {
    // En las tarjetas el botón va dentro de un <Link>: no navegar al abrir.
    e.preventDefault();
    e.stopPropagation();
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setErrorMsg("");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = telefono.replace(/\D/g, "");
    const error = validarTelefono(prefijo, digitos);
    if (error) { setErrorMsg(error); return; }
    setEnviando(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads-alquiler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piso_id: pisoId,
          piso_titulo: pisoTitulo,
          piso_categoria: pisoCategoria,
          nombre: nombre.trim(),
          telefono: `${prefijo} ${digitos}`,
          tipo_interes: tipo,
          grupo_tam: tipo === "grupo" ? grupoTam : null,
          mensaje: mensaje.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrorMsg(data?.error || `Error ${res.status}. Prueba de nuevo.`); return; }
      if (data?.filtered) { setErrorMsg("No hemos podido validar el número. Revisa que esté bien escrito."); return; }
      setEnviado(true);
    } catch {
      setErrorMsg("Sin conexión. Prueba de nuevo o escríbenos por WhatsApp.");
    } finally {
      setEnviando(false);
    }
  }

  const botonStyle: React.CSSProperties =
    variant === "card"
      ? { width: "100%", marginTop: 8, padding: "9px 12px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }
      : { width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: "var(--orange)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" };

  return (
    <>
      <button type="button" onClick={abrir} style={botonStyle}>Quiero Alquilar</button>

      {abierto && mounted && createPortal(
        <div
          onClick={cerrar}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={{ background: "#fff", borderRadius: 14, padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <strong style={{ fontSize: 16, color: "#111827" }}>Quiero alquilar</strong>
              <button type="button" onClick={cerrar} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>{pisoTitulo}</div>

            {enviado ? (
              <p style={{ color: "#16a34a", fontWeight: 600, margin: "12px 0" }}>¡Recibido! Te contactamos enseguida. 🙌</p>
            ) : (
              <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, flex: 1 }}>
                {/* Campos (scrollables si la pantalla es baja) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", minHeight: 0, flex: "1 1 auto", paddingRight: 2 }}>
                {/* Individual vs grupo */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: `2px solid ${tipo === "individual" ? "var(--orange)" : "#e5e7eb"}`, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                    <input type="radio" name="tipo" checked={tipo === "individual"} onChange={() => setTipo("individual")} />
                    Interesado en una habitación
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 12px", border: `2px solid ${tipo === "grupo" ? "var(--orange)" : "#e5e7eb"}`, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                    <input type="radio" name="tipo" checked={tipo === "grupo"} onChange={() => setTipo("grupo")} />
                    Somos un grupo de
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={grupoTam}
                      onClick={(e) => { e.stopPropagation(); setTipo("grupo"); }}
                      onChange={(e) => setGrupoTam(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                      style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
                    />
                    personas
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
                />

                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    value={prefijo}
                    onChange={(e) => setPrefijo(e.target.value)}
                    aria-label="Prefijo país"
                    style={{ flex: "0 0 auto", padding: "8px 6px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14 }}
                  >
                    {PREFIJOS.map((p) => (<option key={p.code} value={p.code}>{p.label}</option>))}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Tu teléfono *"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s]/g, ""))}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Escríbenos</label>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={2}
                    placeholder="Soy grupo de Estudiante/Trabajador que viene por un periodo de…"
                    style={{ width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical" }}
                  />
                </div>
                </div>

                {/* Footer siempre visible con el botón de enviar */}
                <div style={{ flex: "0 0 auto", paddingTop: 12, marginTop: 4, borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="submit"
                    disabled={enviando || !telValido}
                    title={telValido ? "" : "Introduce un teléfono válido"}
                    style={{
                      width: "100%",
                      padding: "13px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: telValido ? "var(--orange)" : "#f7c9a6",
                      color: telValido ? "#fff" : "#fff",
                      opacity: telValido ? 1 : 0.9,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: enviando ? "wait" : telValido ? "pointer" : "not-allowed",
                      transition: "background 0.2s ease",
                    }}
                  >
                    {enviando ? "Enviando…" : telValido ? "Enviar" : "Introduce tu teléfono"}
                  </button>
                  {errorMsg && <p style={{ color: "#dc2626", fontSize: 13, margin: "8px 0 0" }}>{errorMsg}</p>}
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
