"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} style={{
      width: "100%", maxWidth: 380, padding: 32, background: "#fff",
      borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
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
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, boxSizing: "border-box" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>Contraseña</span>
        <input
          type="password" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 15, boxSizing: "border-box" }}
        />
      </label>

      <button type="submit" disabled={busy} style={{
        width: "100%", padding: "12px 0", borderRadius: 8,
        background: "var(--orange, #f97316)", color: "#fff", border: "none",
        fontSize: 15, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}>
        {busy ? "Entrando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
