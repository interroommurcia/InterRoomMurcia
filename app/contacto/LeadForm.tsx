"use client";

import { useState } from "react";
import { SITE_URL } from "../../lib/site";
import { whatsappHref as buildWhatsappHref } from "../../lib/whatsapp";

const WHATSAPP_MESSAGE =
  "Hola, soy propietario y quiero una valoracion gratuita de mi vivienda para alquilarla con InterRoom Murcia.";

function whatsappHref(extra?: string) {
  const text = extra ? `${WHATSAPP_MESSAGE} ${extra}` : WHATSAPP_MESSAGE;
  return buildWhatsappHref(text);
}

const ORIGENES_CONOCIDOS: [pattern: string, label: string][] = [
  ["chatgpt.com", "ChatGPT"],
  ["openai.com", "ChatGPT"],
  ["wa.me", "WhatsApp"],
  ["whatsapp.com", "WhatsApp"],
  ["google.", "Google"],
  ["instagram.com", "Instagram"],
  ["facebook.com", "Facebook"],
  ["tiktok.com", "TikTok"],
  ["bing.com", "Bing"],
];

function detectarOrigen(): string {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) return utmSource.slice(0, 60);

  const ref = document.referrer;
  if (!ref) return "Directo / sin referencia";

  try {
    const refUrl = new URL(ref);
    const host = refUrl.hostname.replace(/^www\./, "");
    const siteHost = new URL(SITE_URL).hostname.replace(/^www\./, "");
    if (host === siteHost) {
      if (refUrl.pathname.startsWith("/blog/")) {
        return `Blog: ${refUrl.pathname.replace("/blog/", "")}`.slice(0, 120);
      }
      return `Interno: ${refUrl.pathname || "/"}`.slice(0, 120);
    }
    const conocido = ORIGENES_CONOCIDOS.find(([pattern]) => host.includes(pattern));
    return conocido ? conocido[1] : host;
  } catch {
    return "Directo / sin referencia";
  }
}

type Status = "idle" | "sending" | "sent" | "error";

export default function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    tipo: "",
    metros: "",
    precioDeseado: "",
    mensaje: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, origen: detectarOrigen() }),
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
      <div className="lead-form-row">
        <label>
          Email (opcional)
          <input
            type="email"
            maxLength={120}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="tu@email.com"
          />
        </label>
        <label>
          Tipo de vivienda
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="">Selecciona...</option>
            <option value="Piso completo">Piso completo</option>
            <option value="Habitacion">Habitacion</option>
          </select>
        </label>
      </div>
      <div className="lead-form-row">
        <label>
          Metros cuadrados (opcional)
          <input
            type="number"
            min={0}
            value={form.metros}
            onChange={(e) => setForm({ ...form, metros: e.target.value })}
            placeholder="70"
          />
        </label>
        <label>
          Precio que esperas cobrar/mes (opcional)
          <input
            type="number"
            min={0}
            value={form.precioDeseado}
            onChange={(e) => setForm({ ...form, precioDeseado: e.target.value })}
            placeholder="600"
          />
        </label>
      </div>
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
        <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-whatsapp-outline">
          <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="#25d366">
            <path d="M19.11 17.28c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/>
            <path d="M26.62 5.4A14.85 14.85 0 0 0 3.51 23.16L2 30l7-1.83a14.83 14.83 0 0 0 7.08 1.8h.01c8.19 0 14.85-6.66 14.85-14.85a14.76 14.76 0 0 0-4.32-9.72zM16.09 27.47h-.01a12.32 12.32 0 0 1-6.28-1.72l-.45-.27-4.16 1.09 1.11-4.05-.29-.47a12.34 12.34 0 1 1 22.87-6.54c0 6.8-5.53 12.33-12.32 12.33z"/>
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
