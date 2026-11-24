"use client";

import { useState } from "react";
import PrefijoSelect from "./PrefijoSelect";

type Props = {
  origen?: string;
};

export default function UneteForm({ origen = "web" }: Props) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [prefijo, setPrefijo] = useState("+34");
  const [telefono, setTelefono] = useState("");
  const [consent, setConsent] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const digitos = telefono.replace(/\D/g, "");
    if (!email.trim() && !digitos) {
      setError("Déjanos al menos un email o un teléfono.");
      return;
    }
    if (!consent) {
      setError("Marca la casilla para poder avisarte.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/leads-comerciales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "estudiante",
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: digitos ? `${prefijo} ${digitos}` : "",
          consentimiento: consent,
          origen,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || `Error ${res.status}. Prueba de nuevo.`); return; }
      setEnviado(true);
    } catch {
      setError("Sin conexión. Prueba de nuevo en un momento.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="unete-ok">
        <p style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", margin: 0 }}>¡Estás en la lista! 🎉</p>
        <p style={{ color: "#4b5563", marginTop: 8 }}>
          Te avisaremos en cuanto quede una habitación libre que te encaje.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15, width: "100%" };

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 440 }}>
      <input type="text" placeholder="Tu nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />

      <input type="email" placeholder="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

      <div style={{ display: "flex", gap: 6 }}>
        <PrefijoSelect value={prefijo} onChange={setPrefijo} />
        <input
          type="tel"
          inputMode="numeric"
          placeholder="Tu móvil"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s]/g, ""))}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
      <p style={{ fontSize: 12, color: "#9ca3af", margin: "-6px 0 0" }}>Deja email, móvil o los dos — con uno nos vale para avisarte.</p>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#4b5563", cursor: "pointer" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span>
          Acepto recibir avisos de InterRoom Murcia (habitaciones disponibles, novedades) por email, WhatsApp o SMS, y el
          tratamiento de mis datos según la{" "}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: "var(--orange)", textDecoration: "underline" }}>
            política de privacidad
          </a>. Puedo darme de baja cuando quiera.
        </span>
      </label>

      <button
        type="submit"
        disabled={enviando}
        style={{ padding: "14px 16px", borderRadius: 12, border: "none", background: "var(--orange)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: enviando ? "wait" : "pointer" }}
      >
        {enviando ? "Enviando…" : "Apúntame a la lista"}
      </button>
      {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p>}
    </form>
  );
}
