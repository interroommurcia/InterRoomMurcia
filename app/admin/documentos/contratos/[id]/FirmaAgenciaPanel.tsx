"use client";

import FirmaPanel from "../../../../../components/FirmaPanel";
import type { Firma } from "../../../../../lib/contratos";

type Props = {
  contratoId: string;
  onDone: () => void;
  onCancel: () => void;
};

export default function FirmaAgenciaPanel({ contratoId, onDone, onCancel }: Props) {
  async function enviar(firma: Firma) {
    const res = await fetch(`/api/admin/contratos/${contratoId}/firmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firma }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Error al firmar");
    onDone();
  }

  return (
    <FirmaPanel
      rolLabel="La Agencia"
      onSubmit={enviar}
      onCancel={onCancel}
    />
  );
}
