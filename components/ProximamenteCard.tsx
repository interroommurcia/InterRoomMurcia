"use client";

import Image from "next/image";
import { useState } from "react";
import type { Piso } from "../lib/pisos";

const PREFIJOS = [
  { code: "+34", label: "🇪🇸 +34", minDigits: 9, maxDigits: 9, mobileHint: /^[67]/ },
  { code: "+351", label: "🇵🇹 +351", minDigits: 9, maxDigits: 9 },
  { code: "+33", label: "🇫🇷 +33", minDigits: 9, maxDigits: 9 },
  { code: "+39", label: "🇮🇹 +39", minDigits: 9, maxDigits: 11 },
  { code: "+44", label: "🇬🇧 +44", minDigits: 10, maxDigits: 10 },
  { code: "+49", label: "🇩🇪 +49", minDigits: 10, maxDigits: 11 },
  { code: "+212", label: "🇲🇦 +212", minDigits: 9, maxDigits: 9 },
  { code: "+40", label: "🇷🇴 +40", minDigits: 9, maxDigits: 9 },
  { code: "+380", label: "🇺🇦 +380", minDigits: 9, maxDigits: 9 },
  { code: "+1", label: "🇺🇸 +1", minDigits: 10, maxDigits: 10 },
  { code: "+52", label: "🇲🇽 +52", minDigits: 10, maxDigits: 10 },
  { code: "+54", label: "🇦🇷 +54", minDigits: 10, maxDigits: 11 },
  { code: "+57", label: "🇨🇴 +57", minDigits: 10, maxDigits: 10 },
  { code: "+58", label: "🇻🇪 +58", minDigits: 10, maxDigits: 10 },
  { code: "+51", label: "🇵🇪 +51", minDigits: 9, maxDigits: 9 },
  { code: "+593", label: "🇪🇨 +593", minDigits: 9, maxDigits: 9 },
];

function validarTelefono(prefijo: string, digitos: string): string | null {
  const p = PREFIJOS.find((x) => x.code === prefijo);
  if (!p) return "Prefijo no válido.";
  if (!/^\d+$/.test(digitos)) return "El teléfono solo puede contener números.";
  if (digitos.length < p.minDigits || digitos.length > p.maxDigits) {
    return p.minDigits === p.maxDigits
      ? `El teléfono debe tener ${p.minDigits} dígitos.`
      : `El teléfono debe tener entre ${p.minDigits} y ${p.maxDigits} dígitos.`;
  }
  if (/^(\d)\1+$/.test(digitos)) return "Introduce un número real.";
  if (p.mobileHint && !p.mobileHint.test(digitos)) {
    return "Para España, el número debe empezar por 6, 7, 8 o 9.";
  }
  return null;
}

export default function ProximamenteCard({ piso }: { piso: Piso }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [nombre, setNombre] = useState("");
  const [prefijo, setPrefijo] = useState("+34");
  const [telefono, setTelefono] = useState("");

  const esCompraventa = piso.categoria === "compraventa";

  async function enviarInteres(e: React.FormEvent) {
    e.preventDefault();
    const digitos = telefono.replace(/\D/g, "");
    const error = validarTelefono(prefijo, digitos);
    if (error) {
      setErrorMsg(error);
      return;
    }
    setEnviando(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/leads-proximamente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piso_id: piso.id,
          piso_titulo: piso.titulo,
          piso_categoria: piso.categoria,
          nombre: nombre.trim(),
          telefono: `${prefijo} ${digitos}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data?.error || `Error ${res.status}. Prueba de nuevo o escríbenos por WhatsApp.`);
        return;
      }
      if (data?.filtered) {
        setErrorMsg("No hemos podido validar el número. Revisa que esté bien escrito.");
        return;
      }
      setEnviado(true);
    } catch (err) {
      setErrorMsg("Sin conexión. Prueba de nuevo o escríbenos por WhatsApp.");
      console.error("[proximamente-card]", err);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="proximamente-card">
      <div className="piso-img">
        {piso.imageUrl && (
          <Image
            src={piso.imageUrl}
            alt={piso.titulo}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
            loading="lazy"
          />
        )}
        <span className="piso-badge estado-proximamente">Próximamente</span>
        <span className={`piso-badge proximamente-tipo ${esCompraventa ? "tipo-compraventa" : "tipo-alquiler"}`}>
          {esCompraventa ? "Compraventa" : "Alquiler"}
        </span>
      </div>
      <div className="piso-body">
        <h4>{piso.titulo}</h4>
        <div className="proximamente-specs">
          {piso.numHabitaciones != null && (
            <span>🛏️ {piso.numHabitaciones} hab.</span>
          )}
          {piso.numBanos != null && (
            <span>🚿 {piso.numBanos} baño{piso.numBanos !== 1 ? "s" : ""}</span>
          )}
        </div>
        {piso.precioMes > 0 && (
          <div className="piso-price" style={{ marginBottom: 4 }}>
            {esCompraventa
              ? `${piso.precioMes.toLocaleString("es-ES")}€`
              : <>{piso.precioMes}€ <span>/mes</span></>}
          </div>
        )}
        <div className="loc">{piso.barrio}</div>

        {enviado ? (
          <p className="proximamente-gracias">¡Apuntado! Te avisaremos.</p>
        ) : mostrarForm ? (
          <form className="proximamente-form" onSubmit={enviarInteres}>
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={prefijo}
                onChange={(e) => setPrefijo(e.target.value)}
                style={{ flex: "0 0 auto", padding: "8px 6px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 14 }}
                aria-label="Prefijo país"
              >
                {PREFIJOS.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Tu teléfono *"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s]/g, ""))}
                style={{ flex: 1 }}
              />
            </div>
            <button type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar"}
            </button>
            {errorMsg && <p className="proximamente-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{errorMsg}</p>}
          </form>
        ) : (
          <button
            className="proximamente-btn"
            onClick={() => setMostrarForm(true)}
          >
            Tengo Interés
          </button>
        )}
      </div>
    </div>
  );
}
