"use client";

import { useState } from "react";

export default function ConvertirClienteButton({
  leadId,
  nombre,
  telefono,
  direccion,
  email,
}: {
  leadId: number;
  nombre: string;
  telefono: string;
  direccion: string;
  email?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function convertir() {
    setStatus("sending");
    try {
      const res = await fetch("/api/admin/clientes/convertir-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, nombre, telefono, direccion, email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") return <span>En Contabilidad</span>;

  return (
    <button type="button" className="btn-ghost" onClick={convertir} disabled={status === "sending"}>
      {status === "sending" ? "Convirtiendo..." : status === "error" ? "Reintentar" : "Convertir en cliente"}
    </button>
  );
}
