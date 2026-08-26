"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { setError("Mínimo 6 caracteres"); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al restablecer");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
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

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShowPwd(!showPwd)}
      aria-label={showPwd ? "Ocultar" : "Mostrar"}
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
  );

  if (!token) {
    return (
      <div style={boxStyle}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Enlace inválido</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>Este enlace no es válido o ha expirado.</p>
          <button onClick={() => router.push("/admin/login")} style={{ ...btnStyle, background: "transparent", color: "var(--orange, #f97316)", border: "1px solid var(--orange, #f97316)" }}>
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={boxStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Contraseña actualizada</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <button onClick={() => router.push("/admin/login")} style={btnStyle}>
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={boxStyle}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>Nueva contraseña</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Introduce tu nueva contraseña</p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Nueva contraseña</span>
        <div style={{ position: "relative" }}>
          <input
            type={showPwd ? "text" : "password"} required autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: 42 }}
          />
          {eyeBtn}
        </div>
      </label>

      <label style={{ display: "block", marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Confirmar contraseña</span>
        <input
          type={showPwd ? "text" : "password"} required autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          style={inputStyle}
        />
      </label>

      <button type="submit" disabled={busy} style={{ ...btnStyle, opacity: busy ? 0.7 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
        {busy ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
