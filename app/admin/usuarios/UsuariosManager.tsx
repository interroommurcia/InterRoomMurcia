"use client";

import { useEffect, useState } from "react";

type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  created_at: string;
};

const FONT = "'Inter', system-ui, sans-serif";

export default function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nombre: "", rol: "comercial" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editandoPass, setEditandoPass] = useState<string | null>(null);
  const [nuevaPass, setNuevaPass] = useState("");
  const [ok, setOk] = useState("");

  async function cargar() {
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json();
    setUsuarios(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      setForm({ email: "", password: "", nombre: "", rol: "comercial" });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear usuario");
    } finally {
      setBusy(false);
    }
  }

  async function cambiarPassword(id: string) {
    if (!nuevaPass.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nuevaPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditandoPass(null);
      setNuevaPass("");
      setOk("Contraseña cambiada correctamente");
      setTimeout(() => setOk(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cambiar contraseña");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActivo(u: Usuario) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !u.activo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar usuario");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p style={{ color: "#9ca3af", fontFamily: FONT }}>Cargando...</p>;

  return (
    <div style={{ fontFamily: FONT }}>
      {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {ok && <div style={{ background: "#f0fdf4", color: "#166534", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{ok}</div>}

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        style={{ padding: "8px 16px", borderRadius: 8, background: showForm ? "#f3f4f6" : "var(--orange)", color: showForm ? "#374151" : "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, marginBottom: 20, fontFamily: FONT }}
      >
        {showForm ? "Cancelar" : "+ Nuevo usuario"}
      </button>

      {showForm && (
        <form onSubmit={crear} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "flex", flexDirection: "column", gap: 4 }}>
              Nombre
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: FONT }} />
            </label>
            <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "flex", flexDirection: "column", gap: 4 }}>
              Email
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: FONT }} />
            </label>
            <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "flex", flexDirection: "column", gap: 4 }}>
              Contraseña
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: FONT }} />
            </label>
            <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, display: "flex", flexDirection: "column", gap: 4 }}>
              Rol
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: FONT }}>
                <option value="comercial">Comercial</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 14, textAlign: "right" }}>
            <button type="submit" disabled={busy} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--orange)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: FONT }}>
              {busy ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usuarios.map((u) => (
          <div key={u.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{u.nombre}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{u.email}</div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: u.rol === "admin" ? "#eff6ff" : "#f0fdf4",
                color: u.rol === "admin" ? "#1e40af" : "#166534",
              }}>
                {u.rol === "admin" ? "Administrador" : "Comercial"}
              </span>
              <button type="button" onClick={() => toggleActivo(u)} disabled={busy} style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 12, border: "none", cursor: "pointer",
                background: u.activo ? "#d1fae5" : "#fee2e2",
                color: u.activo ? "#065f46" : "#991b1b",
              }}>
                {u.activo ? "Activo" : "Inactivo"}
              </button>
              <button
                type="button"
                onClick={() => { setEditandoPass(editandoPass === u.id ? null : u.id); setNuevaPass(""); }}
                style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#374151", fontFamily: FONT }}
              >
                Cambiar contraseña
              </button>
            </div>
            {editandoPass === u.id && (
              <div style={{ display: "flex", gap: 8, padding: "0 18px 14px", alignItems: "center" }}>
                <input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  autoFocus
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: FONT }}
                />
                <button
                  type="button"
                  onClick={() => cambiarPassword(u.id)}
                  disabled={busy || !nuevaPass.trim()}
                  style={{ padding: "8px 16px", borderRadius: 6, background: "var(--orange)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: FONT }}
                >
                  {busy ? "..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditandoPass(null); setNuevaPass(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, padding: 4 }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
        {usuarios.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 24 }}>No hay usuarios creados. Crea el primer usuario administrador.</p>}
      </div>
    </div>
  );
}
