"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { trackEvent } from "../../lib/posthog-client";

// Clave en sessionStorage para que PostHogProvider sepa si el exit
// intent se ha mostrado en esta sesión y pueda disparar el evento
// "siguiente página" cuando el usuario navegue después.
export const EXIT_INTENT_FLAG = "venta_exit_intent_shown_at";

export default function ExitIntent() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Guardamos cuando se mostró y si el usuario convirtió para calcular
  // dwell time y disparar eventos de "abandono tras ver el popup".
  const shownAtRef = useRef<number | null>(null);
  const convertedRef = useRef(false);
  const dwell10FiredRef = useRef(false);

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (dismissed) return;
      if (e.clientY <= 5 && !show) {
        setShow(true);
        shownAtRef.current = Date.now();
        try {
          sessionStorage.setItem(EXIT_INTENT_FLAG, String(Date.now()));
        } catch {
          /* no-op */
        }
        trackEvent("venta_exit_intent_shown", {});
      }
    },
    [dismissed, show]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 8000);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

  // Timer: a los 10s de mostrarse, si sigue abierto sin convertir ni
  // cerrarse, significa que está leyendo o pensando → señal útil
  // para saber qué popups "enganchan" aunque no conviertan.
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      if (!dwell10FiredRef.current && !convertedRef.current) {
        dwell10FiredRef.current = true;
        trackEvent("venta_exit_intent_dwell_10s", {});
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [show]);

  // Al salir de la página (cerrar pestaña, navegar fuera) si vieron el
  // popup pero no convirtieron, registramos abandono con el dwell time.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden") return;
      const shownAt = shownAtRef.current;
      if (!shownAt || convertedRef.current) return;
      const dwellMs = Date.now() - shownAt;
      trackEvent("venta_exit_intent_abandoned", {
        dwell_ms: dwellMs,
        dwell_more_than_10s: dwellMs >= 10000,
      });
      // No volver a disparar en esta sesión
      shownAtRef.current = null;
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  function close() {
    setShow(false);
    setDismissed(true);
    if (convertedRef.current) return; // ya se emitió 'submit', no doblamos
    const dwellMs = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
    trackEvent("venta_exit_intent_closed", {
      dwell_ms: dwellMs,
      dwell_more_than_10s: dwellMs >= 10000,
    });
  }

  function markConverted() {
    convertedRef.current = true;
  }

  if (!show) return null;

  return (
    <div className="exit-overlay" onClick={close}>
      <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="exit-close" onClick={close} aria-label="Cerrar">
          ×
        </button>
        <div className="exit-body">
          <div className="exit-icon">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="22" stroke="var(--orange)" strokeWidth="2.5" />
              <path d="M24 14v12" stroke="var(--orange)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="24" cy="33" r="2" fill="var(--orange)" />
            </svg>
          </div>
          <h3>¿Te vas sin saber cuánto vale tu casa?</h3>
          <p>
            Déjanos tu teléfono y te llamamos en menos de 24h con una valoración
            real de tu inmueble. <strong>Sin compromiso.</strong>
          </p>
          <ExitForm onSuccess={close} onConvert={markConverted} />
        </div>
      </div>
    </div>
  );
}

function ExitForm({ onSuccess, onConvert }: { onSuccess: () => void; onConvert: () => void }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "",
          telefono: phone,
          email: "",
          direccion: "",
          tipo: "",
          precioDeseado: "",
          mensaje: "Lead desde exit-intent popup",
          website: "",
          origen: "exit-intent",
          seccion: "venta",
        }),
      });
      if (!res.ok) throw new Error("fail");
      setStatus("sent");
      onConvert();
      trackEvent("venta_exit_intent_submit", {});
      // Limpia el flag para que no se dispare "next_page" después:
      // ya convirtió, no necesitamos saber a dónde va.
      try { sessionStorage.removeItem(EXIT_INTENT_FLAG); } catch {}
      setTimeout(onSuccess, 2000);
    } catch {
      setStatus("error");
      trackEvent("venta_exit_intent_error", {});
    }
  }

  if (status === "sent") {
    return <p className="exit-ok">Te llamamos pronto.</p>;
  }

  return (
    <form className="exit-form" onSubmit={handleSubmit}>
      <input
        type="tel"
        required
        placeholder="Tu teléfono"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        maxLength={15}
        className="exit-input"
      />
      <button type="submit" className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Enviando..." : "Que me llamen"}
      </button>
      {status === "error" && (
        <p className="exit-error">Error al enviar. Inténtalo de nuevo.</p>
      )}
    </form>
  );
}
