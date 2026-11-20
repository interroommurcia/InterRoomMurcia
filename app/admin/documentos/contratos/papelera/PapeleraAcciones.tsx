"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PapeleraAcciones({ contratoId }: { contratoId: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function restaurar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}/restaurar`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("No se pudo restaurar el contrato.");
      setCargando(false);
    }
  }

  async function eliminarDefinitivo() {
    if (!confirm("¿Eliminar este contrato definitivamente? Esta acción no se puede deshacer.")) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}?permanente=1`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("No se pudo eliminar el contrato.");
      setCargando(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={restaurar}
        disabled={cargando}
        style={{ padding: "6px 12px", background: "#fff", color: "#047857", border: "1px solid #a7f3d0", borderRadius: 7, fontWeight: 500, fontSize: "0.82rem", cursor: cargando ? "wait" : "pointer" }}
      >
        Restaurar
      </button>
      <button
        type="button"
        onClick={eliminarDefinitivo}
        disabled={cargando}
        style={{ padding: "6px 12px", background: "#fff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 7, fontWeight: 500, fontSize: "0.82rem", cursor: cargando ? "wait" : "pointer" }}
      >
        Eliminar ya
      </button>
    </div>
  );
}
