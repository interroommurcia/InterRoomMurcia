"use client";

import { useState } from "react";

// CTA compacto "Busco habitación": el estudiante deja email o teléfono (al menos
// uno es obligatorio) y lo avisamos cuando quede algo libre. Va a la sección
// "Busco Habitación" del panel y avisa por Telegram.
// `origen` identifica desde dónde entró (catalogo, home, …).

export default function BuscoHabitacionCTA({ origen = "web", titulo, subtitulo }: {
  origen?: string;
  titulo?: string;
  subtitulo?: string;
}) {
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
      const res = await fetch("/api/leads-busco-habitacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  const inputStyle: React.CSSProperties = {
    padding: "11px 12px", borderRadius: 10, border: "1px solid #d1d5db", fontSize: 15, width: "100%", boxSizing: "border-box",
  };

  if (enviado) {
    return (
      <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 14, padding: 20, textAlign: "center" }}>
        <p style={{ margin: 0, color: "#065f46", fontWeight: 700, fontSize: 16 }}>¡Apuntado! 🎉</p>
        <p style={{ margin: "6px 0 0", color: "#047857", fontSize: 14 }}>Te avisaremos en cuanto haya una habitación que te encaje.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800, color: "#111827" }}>
        {titulo ?? "¿No encuentras tu habitación? Te avisamos"}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6b7280" }}>
        {subtitulo ?? "Déjanos tu email o tu móvil y te avisamos en cuanto quede una habitación libre que encaje contigo."}
      </p>
      <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="Tu nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
        <input type="email" placeholder="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={prefijo} onChange={(e) => setPrefijo(e.target.value)} style={{ ...inputStyle, width: 72, flex: "0 0 auto", textAlign: "center" }} aria-label="Prefijo" />
          <input type="tel" placeholder="Tu móvil" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inputStyle} />
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "-2px 0 0" }}>Con el email o el móvil nos vale — al menos uno.</p>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#6b7280" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Acepto recibir avisos de InterRoom Murcia (habitaciones disponibles) por email, WhatsApp o SMS, y la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: "var(--orange)", textDecoration: "underline" }}>política de privacidad</a>.
          </span>
        </label>
        {error && <p style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={enviando} style={{ padding: "12px 16px", borderRadius: 10, border: "none", background: "var(--orange)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: enviando ? "wait" : "pointer" }}>
          {enviando ? "Enviando…" : "Avísame cuando haya habitación"}
        </button>
      </form>
    </div>
  );
}
