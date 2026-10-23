import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ContratoRender from "../../../components/ContratoRender";
import { getContratoPorToken } from "../../../lib/contratos";
import FirmaPublicaPanel from "./FirmaPublicaPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Firmar contrato — InterRoom Murcia",
  robots: { index: false, follow: false },
};

export default async function FirmarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contrato = await getContratoPorToken(token);
  if (!contrato) notFound();

  const yaFirmoPropietario = Boolean(contrato.firma_propietario);
  const cancelado = contrato.estado === "cancelado";
  const totalmenteFirmado = contrato.estado === "firmado";

  return (
    <main style={{ minHeight: "100vh", background: "#f4f4f1" }}>
      {/* Banner superior con estado */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e5e5",
          padding: "20px 16px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#ea6a12", fontWeight: 500, marginBottom: 6 }}>
            Firma de contrato
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 500, color: "#1a1a1a" }}>
            Inter<span style={{ color: "#ea6a12" }}>Room</span> Murcia
          </div>
          {totalmenteFirmado && (
            <>
              <div style={{ marginTop: 10, padding: "8px 16px", display: "inline-block", background: "#d1fae5", color: "#065f46", borderRadius: 999, fontSize: "0.85rem", fontWeight: 500 }}>
                ✓ Contrato firmado por ambas partes
              </div>
              <div style={{ marginTop: 14 }}>
                <a
                  href={`/api/contratos/pdf/${token}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 22px",
                    background: "#ea6a12",
                    color: "#fff",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                  }}
                >
                  📄 Descargar PDF del contrato
                </a>
              </div>
            </>
          )}
          {cancelado && (
            <div style={{ marginTop: 10, padding: "8px 16px", display: "inline-block", background: "#fee2e2", color: "#991b1b", borderRadius: 999, fontSize: "0.85rem", fontWeight: 500 }}>
              Este contrato está cancelado
            </div>
          )}
        </div>
      </div>

      {/* Panel de firma (si procede) */}
      {!yaFirmoPropietario && !cancelado && (
        <div style={{ padding: "28px 16px 0", display: "flex", justifyContent: "center" }}>
          <FirmaPublicaPanel
            token={token}
            defaultName={contrato.datos.propietario?.nombre || ""}
            defaultDni={contrato.datos.propietario?.dni || ""}
          />
        </div>
      )}

      {yaFirmoPropietario && !totalmenteFirmado && !cancelado && (
        <div style={{ padding: "28px 16px 0", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: "1rem", fontWeight: 500, color: "#059669", marginBottom: 6 }}>
              ✓ Firma registrada
            </div>
            <p style={{ fontSize: "0.9rem", color: "#555", margin: 0 }}>
              Ya has firmado este contrato. Cuando la agencia también firme, recibirás una copia del PDF por correo electrónico.
            </p>
          </div>
        </div>
      )}

      {/* Preview completo del contrato */}
      <ContratoRender contrato={contrato} showPlaceholders={false} />
    </main>
  );
}
