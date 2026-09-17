"use client";

import { useState } from "react";
import { detectarOrigen } from "../../lib/detectar-origen";
import { whatsappHref } from "../../lib/whatsapp";

const WA_MSG = "Hola, estoy interesado en oportunidades de inversión inmobiliaria con InterRoom.";

type Status = "idle" | "sending" | "sent" | "error";

export default function InversoresForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    tipo: "",
    presupuesto: "",
    mensaje: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono,
          email: form.email,
          direccion: "",
          tipo: form.tipo,
          precioDeseado: form.presupuesto,
          mensaje: form.mensaje,
          origen: detectarOrigen(),
          seccion: "inversores",
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="lead-sent">
        <h3>Solicitud recibida</h3>
        <p>Te contactamos en menos de 24h para hablar de tu inversion.</p>
        <a href={whatsappHref(WA_MSG)} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Escribir por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <div className="lead-form-row">
        <label>
          Nombre
          <input required maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Tu nombre" />
        </label>
        <label>
          Telefono
          <input required maxLength={30} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="600 000 000" />
        </label>
      </div>
      <div className="lead-form-row">
        <label>
          Email
          <input type="email" maxLength={120} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" />
        </label>
        <label>
          Tipo de inversion
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="">Selecciona...</option>
            <option value="Compraventa inmueble">Compraventa inmueble</option>
            <option value="Creditos NPL">Creditos NPL</option>
            <option value="Ambos">Ambos</option>
          </select>
        </label>
      </div>
      <label>
        Presupuesto aproximado (€)
        <input type="number" min={0} value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: e.target.value })} placeholder="150000" />
      </label>
      <label>
        Cuentanos que buscas (opcional)
        <textarea maxLength={500} rows={3} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} placeholder="Tipo de inmueble, zona preferida, rentabilidad esperada..." />
      </label>
      <div className="lead-form-actions">
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? "Enviando..." : "Quiero informacion"}
        </button>
        <a href={whatsappHref(WA_MSG)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-whatsapp-outline">
          <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="#25d366">
            <path d="M19.11 17.28c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
            <path d="M26.62 5.4A14.85 14.85 0 0 0 3.51 23.16L2 30l7-1.83a14.83 14.83 0 0 0 7.08 1.8h.01c8.19 0 14.85-6.66 14.85-14.85a14.76 14.76 0 0 0-4.32-9.72zM16.09 27.47h-.01a12.32 12.32 0 0 1-6.28-1.72l-.45-.27-4.16 1.09 1.11-4.05-.29-.47a12.34 12.34 0 1 1 22.87-6.54c0 6.8-5.53 12.33-12.32 12.33z" />
          </svg>
          O escribenos por WhatsApp
        </a>
      </div>
      {status === "error" && (
        <p className="lead-form-error">No se pudo enviar. Prueba por WhatsApp o intentalo de nuevo.</p>
      )}
    </form>
  );
}
