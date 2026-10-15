"use client";

import Image from "next/image";
import { useState } from "react";
import type { Piso } from "../lib/pisos";

export default function ProximamenteCard({ piso }: { piso: Piso }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  async function enviarInteres(e: React.FormEvent) {
    e.preventDefault();
    if (!telefono.trim()) return;
    setEnviando(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          direccion: "",
          mensaje: `Interesado en propiedad próximamente: ${piso.titulo}`,
          seccion: "estudiantes",
          origen: "catalogo-proximamente",
        }),
      });
      setEnviado(true);
    } catch {
      // silent
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
