"use client";

import { useEffect, useState, useCallback } from "react";

export default function ExitIntent() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (dismissed) return;
      if (e.clientY <= 5 && !show) {
        setShow(true);
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

  function close() {
    setShow(false);
    setDismissed(true);
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
          <ExitForm onSuccess={close} />
        </div>
      </div>
    </div>
  );
}

function ExitForm({ onSuccess }: { onSuccess: () => void }) {
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
      setTimeout(onSuccess, 2000);
    } catch {
      setStatus("error");
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
