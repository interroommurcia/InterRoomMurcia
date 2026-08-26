"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "sent">("login");
  const [forgotBusy, setForgotBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Credenciales incorrectas");
      router.push(params.get("redirect") || "/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar el enlace");
      setMode("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setForgotBusy(false);
    }
  }

  const boxStyle: React.CSSProperties = {
    width: "100%", maxWidth: 380, padding: 32, background: "#fff",
    borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 15, boxSizing: "border-box",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%", padding: "12px 0", borderRadius: 8,
    background: "var(--orange, #f97316)", color: "#fff", border: "none",
    fontSize: 15, fontWeight: 600, cursor: "pointer",
  };

  if (mode === "sent") {
    return (
      <div style={boxStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Revisa tu correo</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>
            Si existe una cuenta con <strong>{email}</strong>, hemos enviado un enlace para restablecer la contraseña.
          </p>
          <button onClick={() => setMode("login")} style={{ ...btnStyle, background: "transparent", color: "var(--orange, #f97316)", border: "1px solid var(--orange, #f97316)" }}>
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={handleForgot} style={boxStyle}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>Recuperar contraseña</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Introduce tu email y te enviamos un enlace</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ display: "block", marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Email</span>
          <input
            type="email" required autoFocus autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <button type="submit" disabled={forgotBusy} style={{ ...btnStyle, opacity: forgotBusy ? 0.7 : 1, cursor: forgotBusy ? "not-allowed" : "pointer" }}>
          {forgotBusy ? "Enviando..." : "Enviar enlace"}
        </button>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button type="button" onClick={() => { setMode("login"); setError(""); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
            Volver al login
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={boxStyle}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>InterRoom</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Acceso al backoffice</p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Email</span>
        <input
          type="email" required autoFocus autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "block", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Contraseña</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPwd ? "text" : "password"} required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: "#9ca3af", display: "flex", alignItems: "center",
            }}
          >
            {showPwd ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M14.12 14.12a3 3 0 11-4.24-4.24"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </label>

      <div style={{ textAlign: "right", marginBottom: 16 }}>
        <button type="button" onClick={() => { setMode("forgot"); setError(""); }} style={{ background: "none", border: "none", color: "var(--orange, #f97316)", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
          He olvidado mi contraseña
        </button>
      </div>

      <button type="submit" disabled={busy} style={{ ...btnStyle, opacity: busy ? 0.7 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
        {busy ? "Entrando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
