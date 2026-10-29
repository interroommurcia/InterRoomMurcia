"use client";

import { useState } from "react";
import { detectarOrigen } from "../../lib/detectar-origen";
import { whatsappHref } from "../../lib/whatsapp";
import { trackEvent } from "../../lib/posthog-client";

const WA_MSG = "Hola, quiero vender mi inmueble con InterRoom.";

type Status = "idle" | "sending" | "sent" | "error";

export default function VentaForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    website: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Hace falta el nombre y al menos uno de los dos: teléfono o email.
    if (!form.nombre.trim()) { setError("Dinos tu nombre."); return; }
    if (!form.telefono.trim() && !form.email.trim()) {
      setError("Déjanos tu teléfono o tu email (al menos uno).");
      return;
    }
    setError("");
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
          tipo: "",
          precioDeseado: "",
          mensaje: "",
          website: form.website,
          origen: detectarOrigen(),
          seccion: "venta",
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
      trackEvent("venta_form_submit", {
        tiene_email: Boolean(form.email),
        tiene_telefono: Boolean(form.telefono),
      });
    } catch {
      setStatus("error");
      trackEvent("venta_form_error", {});
    }
  }

  if (status === "sent") {
    return (
      <div className="lead-sent">
        <div className="lead-sent-icon">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="var(--orange)" opacity="0.12" />
            <circle cx="24" cy="24" r="22" stroke="var(--orange)" strokeWidth="2" />
            <path d="M14 24l7 7 13-13" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Solicitud recibida</h3>
        <p>Te contactamos en menos de 24h con una valoración de tu inmueble.</p>
        <a href={whatsappHref(WA_MSG)} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Escribir por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }}
      />

      <label>
        Nombre
        <input required maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Tu nombre" />
      </label>
      <div className="lead-form-row">
        <label>
          Teléfono
          <input type="tel" maxLength={30} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="600 000 000" />
        </label>
        <label>
          Email
          <input type="email" maxLength={120} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" />
        </label>
      </div>
      <p className="lead-form-hint">Déjanos tu teléfono o tu email (al menos uno) y te llamamos o escribimos.</p>

      <div className="lead-form-actions">
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? "Enviando..." : "Pedir valoración gratuita"}
        </button>
      </div>

      <a href="tel:+34675432133" className="lead-phone">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </svg>
        +34 675 432 133
      </a>

      <div className="lead-form-alt">
        <span>¿Prefieres hablar?</span>
        <a
          href={whatsappHref(WA_MSG)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost btn-whatsapp-outline"
          onClick={() => trackEvent("venta_whatsapp_click", { desde: "form_alt" })}
        >
          <svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" fill="#25d366">
            <path d="M19.11 17.28c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
            <path d="M26.62 5.4A14.85 14.85 0 0 0 3.51 23.16L2 30l7-1.83a14.83 14.83 0 0 0 7.08 1.8h.01c8.19 0 14.85-6.66 14.85-14.85a14.76 14.76 0 0 0-4.32-9.72zM16.09 27.47h-.01a12.32 12.32 0 0 1-6.28-1.72l-.45-.27-4.16 1.09 1.11-4.05-.29-.47a12.34 12.34 0 1 1 22.87-6.54c0 6.8-5.53 12.33-12.32 12.33z" />
          </svg>
          WhatsApp
        </a>
      </div>

      {error && <p className="lead-form-error">{error}</p>}
      {status === "error" && (
        <p className="lead-form-error">No se pudo enviar. Prueba por WhatsApp o inténtalo de nuevo.</p>
      )}
    </form>
  );
}
