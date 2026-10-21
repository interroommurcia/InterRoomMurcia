"use client";

import Image from "next/image";
import { useState } from "react";
import type { Piso } from "../lib/pisos";

export default function ProximamenteCard({ piso }: { piso: Piso }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const esCompraventa = piso.categoria === "compraventa";

  async function enviarInteres(e: React.FormEvent) {
    e.preventDefault();
    if (!telefono.trim()) return;
    setEnviando(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads-proximamente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piso_id: piso.id,
          piso_titulo: piso.titulo,
          piso_categoria: piso.categoria,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || `Error ${res.status}. Prueba de nuevo o escríbenos por WhatsApp.`);
        return;
      }
      setEnviado(true);
    } catch (err) {
      setErrorMsg("Sin conexión. Prueba de nuevo o escríbenos por WhatsApp.");
      console.error("[proximamente-card]", err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="proximamente-card">
      <div className="piso-img">
        {piso.imageUrl && (
          <Image
            src={piso.imageUrl}
            alt={piso.titulo}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
            loading="lazy"
          />
        )}
        <span className="piso-badge estado-proximamente">Próximamente</span>
        <span className={`piso-badge proximamente-tipo ${esCompraventa ? "tipo-compraventa" : "tipo-alquiler"}`}>
          {esCompraventa ? "Compraventa" : "Alquiler"}
        </span>
      </div>
      <div className="piso-body">
        <h4>{piso.titulo}</h4>
        <div className="proximamente-specs">
          {piso.numHabitaciones != null && (
            <span>🛏️ {piso.numHabitaciones} hab.</span>
          )}
          {piso.numBanos != null && (
            <span>🚿 {piso.numBanos} baño{piso.numBanos !== 1 ? "s" : ""}</span>
          )}
        </div>
        {piso.precioMes > 0 && (
          <div className="piso-price" style={{ marginBottom: 4 }}>
            {esCompraventa
              ? `${piso.precioMes.toLocaleString("es-ES")}€`
              : <>{piso.precioMes}€ <span>/mes</span></>}
          </div>
        )}
        <div className="loc">{piso.barrio}</div>

        {enviado ? (
          <p className="proximamente-gracias">¡Apuntado! Te avisaremos.</p>
        ) : mostrarForm ? (
          <form className="proximamente-form" onSubmit={enviarInteres}>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Tu teléfono *"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <button type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar"}
            </button>
            {errorMsg && <p className="proximamente-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{errorMsg}</p>}
          </form>
        ) : (
          <button
            className="proximamente-btn"
            onClick={() => setMostrarForm(true)}
          >
            Tengo Interés
          </button>
        )}
      </div>
    </div>
  );
}
