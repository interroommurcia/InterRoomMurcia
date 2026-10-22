"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FirmaAgenciaPanel from "./FirmaAgenciaPanel";

type Props = {
  contratoId: string;
  estado: string;
  signingLink: string | null;
};

export default function ContratoAcciones({ contratoId, estado, signingLink }: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [firmandoAgencia, setFirmandoAgencia] = useState(false);
  const [error, setError] = useState("");

  async function generarLink() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}/generar-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  async function copiarLink() {
    if (!signingLink) return;
    try {
      await navigator.clipboard.writeText(signingLink);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  function waUrl(): string {
    if (!signingLink) return "#";
    const msg = `Hola, aquí tienes el contrato de encargo de venta en exclusiva para firmarlo online. Enlace: ${signingLink}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  const faltaAgencia = estado === "pendiente_firmas" || estado === "firmado_propietario";
  const yaFirmado = estado === "firmado";
  const cancelado = estado === "cancelado";

  return (
    <div className="analytics-card" style={{ marginTop: 24 }}>
      {estado === "borrador" && (
        <>
          <h3>Siguiente paso: generar enlace de firma</h3>
          <p style={{ fontSize: "0.9rem", opacity: 0.75, margin: "4px 0 14px" }}>
            Esto creará un enlace privado y único para que el propietario firme online.
            Después tú podrás firmar como agencia desde aquí.
          </p>
          <button
            onClick={generarLink}
            disabled={cargando}
            style={{
              padding: "10px 22px",
              background: "var(--orange)",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontWeight: 500,
              cursor: cargando ? "wait" : "pointer",
              opacity: cargando ? 0.6 : 1,
            }}
          >
            {cargando ? "Generando…" : "🔗 Generar enlace de firma"}
          </button>
        </>
      )}

      {signingLink && !yaFirmado && !cancelado && (
        <>
          <h3>Enlace de firma del propietario</h3>
          <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "4px 0 10px" }}>
            Envía este enlace al propietario por WhatsApp o email. Es privado — solo lo tiene quien lo recibe.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <input
              type="text"
              readOnly
              value={signingLink}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: "1 1 300px",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontFamily: "monospace",
                background: "#fafafa",
              }}
            />
            <button
              onClick={copiarLink}
              style={{ padding: "10px 18px", border: "1px solid #ddd", background: "#fff", borderRadius: 8, cursor: "pointer" }}
            >
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
            <a
              href={waUrl()}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "10px 18px",
                background: "#25d366",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.9rem",
              }}
            >
              Enviar por WhatsApp
            </a>
          </div>
        </>
      )}

      {faltaAgencia && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eee" }}>
          <h3>Firmar como La Agencia</h3>
          <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "4px 0 10px" }}>
            Cuando el propietario haya firmado (o también antes), firma tú y el PDF se generará automáticamente.
          </p>
          {!firmandoAgencia ? (
            <button
              onClick={() => setFirmandoAgencia(true)}
              style={{
                padding: "10px 22px",
                background: "var(--ink)",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              ✍️ Firmar yo (agencia)
            </button>
          ) : (
            <FirmaAgenciaPanel
              contratoId={contratoId}
              onCancel={() => setFirmandoAgencia(false)}
              onDone={() => router.refresh()}
            />
          )}
        </div>
      )}

      {yaFirmado && (
        <>
          <h3>✓ Contrato firmado por ambas partes</h3>
          <p style={{ fontSize: "0.9rem", opacity: 0.75, margin: "4px 0 14px" }}>
            Se ha enviado una copia por email al propietario y por Telegram a tu chat.
          </p>
          <a
            href={`/api/admin/contratos/${contratoId}/pdf`}
            style={{
              display: "inline-block",
              padding: "10px 22px",
              background: "var(--orange)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            📄 Descargar PDF firmado
          </a>
        </>
      )}

      {cancelado && (
        <>
          <h3>Contrato cancelado</h3>
          <p style={{ fontSize: "0.9rem", opacity: 0.75 }}>
            Este contrato ha sido marcado como cancelado y no admite más firmas.
          </p>
        </>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
