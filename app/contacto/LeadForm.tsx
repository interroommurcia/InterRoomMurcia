"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "34613096518";

const WHATSAPP_MESSAGE =
  "Hola, soy propietario y quiero una valoracion gratuita de mi vivienda para alquilarla con InterRoom Murcia.";

function whatsappHref(extra?: string) {
  const text = extra ? `${WHATSAPP_MESSAGE} ${extra}` : WHATSAPP_MESSAGE;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

type Status = "idle" | "sending" | "sent" | "error";

export default function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({ nombre: "", telefono: "", direccion: "", mensaje: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        <p>Te contactamos en menos de 24h. Si quieres ir mas rapido, escribenos ya por WhatsApp.</p>
        <a
          href={whatsappHref(`Direccion: ${form.direccion}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
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
          <input
            required
            maxLength={120}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Tu nombre"
          />
        </label>
        <label>
          Telefono
          <input
            required
            maxLength={30}
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            placeholder="600 000 000"
          />
        </label>
      </div>
      <label>
        Direccion o zona de la vivienda
        <input
          required
          maxLength={200}
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          placeholder="Calle, barrio o zona en Murcia o Cartagena"
        />
      </label>
      <label>
        Cuentanos algo mas (opcional)
        <textarea
          maxLength={500}
          rows={3}
          value={form.mensaje}
          onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
          placeholder="Numero de habitaciones, estado del piso..."
        />
      </label>
      <div className="lead-form-actions">
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? "Enviando..." : "Quiero mi valoracion gratuita"}
        </button>
        <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          O escribenos por WhatsApp
        </a>
      </div>
      {status === "error" && (
        <p className="lead-form-error">No se pudo enviar. Prueba por WhatsApp o intentalo de nuevo.</p>
      )}
    </form>
  );
}
