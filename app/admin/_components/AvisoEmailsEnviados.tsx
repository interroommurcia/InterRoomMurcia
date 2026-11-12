"use client";

import { useEffect, useState } from "react";

type EmailEnviado = {
  id: string;
  destinatario: string;
  asunto: string;
  contexto: string | null;
  created_at: string;
};

export function AvisoEmailsEnviados() {
  const [pendientes, setPendientes] = useState<EmailEnviado[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [marcando, setMarcando] = useState(false);

  async function cargar() {
    try {
      const r = await fetch("/api/admin/emails-enviados", { cache: "no-store" });
      if (!r.ok) return;
      setPendientes(await r.json());
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function marcarVistos() {
    setMarcando(true);
    try {
      await fetch("/api/admin/emails-enviados", { method: "POST" });
      setPendientes([]);
      setAbierto(false);
    } finally {
      setMarcando(false);
    }
  }

  if (!pendientes.length) return null;

  const n = pendientes.length;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
        border: "1px solid #fed7aa",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.95rem", color: "#9a3412", fontWeight: 600 }}>
          📧 {n} correo{n === 1 ? "" : "s"} electrónico{n === 1 ? "" : "s"} enviado{n === 1 ? "" : "s"} con éxito
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            style={{
              background: "transparent",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {abierto ? "Ocultar" : "Ver detalle"}
          </button>
          <button
            type="button"
            onClick={marcarVistos}
            disabled={marcando}
            style={{
              background: "#ea6a12",
              border: "none",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: marcando ? "wait" : "pointer",
              opacity: marcando ? 0.6 : 1,
            }}
          >
            {marcando ? "Marcando…" : "Visto"}
          </button>
        </div>
      </div>

      {abierto && (
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", borderTop: "1px solid #fed7aa", paddingTop: 10 }}>
          {pendientes.map((e) => (
            <li key={e.id} style={{ padding: "6px 0", fontSize: "0.85rem", color: "#4b5563" }}>
              <strong style={{ color: "#111827" }}>{e.asunto}</strong>
              <div style={{ opacity: 0.8 }}>
                Para {e.destinatario}
                {e.contexto ? ` · ${e.contexto}` : ""} ·{" "}
                {new Date(e.created_at).toLocaleString("es-ES")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
