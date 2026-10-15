"use client";

import { useState, useRef } from "react";

const MARGENES: Record<string, number> = {
  Iberdrola: 0.18,
  Endesa: 0.16,
  Naturgy: 0.17,
  Repsol: 0.14,
  TotalEnergies: 0.13,
  Holaluz: 0.08,
  "Octopus Energy": 0.07,
  Otra: 0.15,
};

export default function ComparadorForm({
  comercializadoras,
}: {
  comercializadoras: string[];
}) {
  const [mode, setMode] = useState<"datos" | "factura">("datos");
  const [importe, setImporte] = useState("");
  const [comercializadora, setComercializadora] = useState("");
  const [potencia, setPotencia] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consentimiento, setConsentimiento] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [ahorro, setAhorro] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function calcularAhorro() {
    const imp = parseFloat(importe);
    if (!imp || imp <= 0) return null;
    const margen = MARGENES[comercializadora] ?? 0.15;
    return Math.round(imp * margen * 12);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const fd = new FormData();
    fd.append("telefono", telefono);
    fd.append("nombre", nombre);
    if (mode === "datos") {
      fd.append("importeMensual", importe);
      fd.append("comercializadora", comercializadora);
      fd.append("potenciaContratada", potencia);
    }
    if (file) {
      fd.append("factura", file);
    }

    try {
      const res = await fetch("/api/comparador-luz", { method: "POST", body: fd });
      if (!res.ok) throw new Error("fail");
      const estimado = calcularAhorro();
      setAhorro(estimado);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="comp-card comp-result">
        <div className="comp-result-icon">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="var(--orange)" />
            <path d="M14 24l7 7 13-13" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>¡Recibido!</h2>
        {ahorro && ahorro > 0 ? (
          <p className="comp-result-ahorro">
            Podrías ahorrar hasta <strong>{ahorro}€/año</strong> en tu factura de la luz.
          </p>
        ) : (
          <p>Hemos recibido tus datos correctamente.</p>
        )}
        <p className="comp-result-sub">
          Te llamamos en menos de 24h con una propuesta personalizada. Sin compromiso.
        </p>
      </div>
    );
  }

  return (
    <div className="comp-card">
      <div className="comp-tabs">
        <button
          type="button"
          className={`comp-tab ${mode === "datos" ? "comp-tab-active" : ""}`}
          onClick={() => setMode("datos")}
        >
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
            <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Introducir datos
        </button>
        <button
          type="button"
          className={`comp-tab ${mode === "factura" ? "comp-tab-active" : ""}`}
          onClick={() => setMode("factura")}
        >
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
            <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 14l4-3 3 2 4-4 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Subir factura
        </button>
      </div>

      <form className="comp-form" onSubmit={handleSubmit}>
        {mode === "datos" ? (
          <>
            <div className="comp-field">
              <label htmlFor="importe">¿Cuánto pagas al mes? (€)</label>
              <input
                id="importe"
                type="number"
                min="1"
                step="0.01"
                placeholder="Ej: 85"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                required
                className="comp-input"
              />
            </div>
            <div className="comp-field">
              <label htmlFor="comercializadora">Comercializadora actual</label>
              <select
                id="comercializadora"
                value={comercializadora}
                onChange={(e) => setComercializadora(e.target.value)}
                required
                className="comp-input"
              >
                <option value="">Selecciona...</option>
                {comercializadoras.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="comp-field">
              <label htmlFor="potencia">Potencia contratada (kW) — opcional</label>
              <input
                id="potencia"
                type="number"
                min="0"
                step="0.1"
                placeholder="Ej: 4.6"
                value={potencia}
                onChange={(e) => setPotencia(e.target.value)}
                className="comp-input"
              />
            </div>
          </>
        ) : (
          <div className="comp-upload-zone" onClick={() => fileRef.current?.click()}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="comp-file-input"
            />
            {file ? (
              <div className="comp-upload-preview">
                <svg viewBox="0 0 24 24" fill="none" width="28" height="28" aria-hidden="true">
                  <path d="M9 12l2 2 4-4" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="10" stroke="var(--orange)" strokeWidth="2" />
                </svg>
                <span>{file.name}</span>
                <button
                  type="button"
                  className="comp-upload-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <svg viewBox="0 0 48 48" fill="none" width="48" height="48" aria-hidden="true">
                  <rect x="6" y="10" width="36" height="28" rx="4" stroke="var(--orange)" strokeWidth="2" />
                  <circle cx="18" cy="22" r="4" stroke="var(--orange)" strokeWidth="2" />
                  <path d="M6 34l10-8 8 6 8-10 10 12" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p>
                  <strong>Haz clic o arrastra</strong> tu factura aquí
                </p>
                <span className="comp-upload-hint">PDF, foto (JPG, PNG) — máx 10MB</span>
              </>
            )}
          </div>
        )}

        <hr className="comp-divider" />

        <div className="comp-field">
          <label htmlFor="comp-nombre">Tu nombre</label>
          <input
            id="comp-nombre"
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="comp-input"
            maxLength={120}
          />
        </div>
        <div className="comp-field">
          <label htmlFor="comp-tel">
            Tu teléfono <span className="comp-required">*</span>
          </label>
          <input
            id="comp-tel"
            type="tel"
            required
            placeholder="Ej: 612 345 678"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="comp-input"
            maxLength={15}
          />
        </div>

        <label className="comp-consent">
          <input
            type="checkbox"
            required
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
          />
          <span>
            Acepto que InterRoom trate mis datos para analizar mi factura y contactarme con una
            propuesta de ahorro. Mis datos podrán ser cedidos a comercializadoras de energía
            colaboradoras con este fin.{" "}
            <a href="/politica-privacidad" target="_blank" rel="noopener noreferrer">
              Política de privacidad
            </a>
          </span>
        </label>

        <button type="submit" className="btn-primary comp-submit" disabled={status === "sending"}>
          {status === "sending" ? "Enviando..." : "Quiero saber cuánto ahorro"}
        </button>

        {status === "error" && (
          <p className="comp-error">Error al enviar. Inténtalo de nuevo.</p>
        )}

        <p className="comp-legal">
          Te llamamos en menos de 24h. Sin compromiso, sin spam.
        </p>
      </form>
    </div>
  );
}
