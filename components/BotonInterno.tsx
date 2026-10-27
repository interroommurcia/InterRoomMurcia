"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

// Marca ESTE navegador/dispositivo como interno (tú), para que tus propias
// visitas a la web pública no se graben ni cuenten. Se guarda en localStorage
// (por dispositivo) y se refleja en PostHog como:
//   - super propiedad es_interno=true (se adjunta a cada evento)
//   - propiedad de persona es_interno=true (marca al visitante, retroactivo)
// El mismo literal se lee en PostHogProvider para desactivar la grabación.
export const INTERNO_FLAG = "ir_interno";

export function marcarInterno(on: boolean) {
  try {
    if (on) {
      localStorage.setItem(INTERNO_FLAG, "1");
      posthog.register({ es_interno: "true" });
      posthog.setPersonProperties({ es_interno: "true" });
      try { posthog.stopSessionRecording(); } catch {}
    } else {
      localStorage.removeItem(INTERNO_FLAG);
      posthog.unregister("es_interno");
      posthog.setPersonProperties({ es_interno: "false" });
    }
  } catch {
    /* localStorage/posthog no disponible: no-op */
  }
}

export default function BotonInterno() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    try { setOn(localStorage.getItem(INTERNO_FLAG) === "1"); } catch { setOn(false); }
  }, []);

  function toggle() {
    const next = !on;
    marcarInterno(next);
    setOn(next);
  }

  if (on === null) return null;

  return (
    <button
      onClick={toggle}
      title="Afecta solo a este dispositivo. Púlsalo también en tu móvil."
      style={{
        padding: "6px 12px",
        border: `1px solid ${on ? "#16a34a" : "#ddd"}`,
        background: on ? "#f0fdf4" : "#fff",
        color: on ? "#15803d" : "#333",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {on ? "✓ Este dispositivo está excluido" : "🙈 No grabar mis visitas (este dispositivo)"}
    </button>
  );
}
