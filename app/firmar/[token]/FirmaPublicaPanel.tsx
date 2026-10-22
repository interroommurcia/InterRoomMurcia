"use client";

import { useState } from "react";
import FirmaPanel from "../../../components/FirmaPanel";
import type { Firma } from "../../../lib/contratos";

export default function FirmaPublicaPanel({
  token,
  defaultName,
  defaultDni,
}: {
  token: string;
  defaultName: string;
  defaultDni: string;
}) {
  const [exito, setExito] = useState(false);

  async function enviar(firma: Firma) {
    const res = await fetch("/api/contratos/firmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firma }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Error al firmar");
    setExito(true);
    // Recarga suave para mostrar el estado "ya firmado"
    setTimeout(() => window.location.reload(), 800);
  }

  if (exito) {
    return (
      <div style={{ padding: 24, background: "#d1fae5", color: "#065f46", borderRadius: 10, maxWidth: 560, textAlign: "center" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: 4 }}>✓ Firma registrada</div>
        <div style={{ fontSize: "0.9rem" }}>Un momento…</div>
      </div>
    );
  }

  return (
    <FirmaPanel
      rolLabel="El Propietario"
      defaultName={defaultName}
      defaultDni={defaultDni}
      onSubmit={enviar}
    />
  );
}
