import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNav } from "../../../../../components/AdminNav";
import ContratoRender from "../../../../../components/ContratoRender";
import { getContrato } from "../../../../../lib/contratos";
import { SITE_URL } from "../../../../../lib/site";
import ContratoAcciones from "./ContratoAcciones";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contrato — Backoffice",
  robots: { index: false, follow: false },
};

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente_firmas: "Pendiente firmas",
  firmado_propietario: "Firmó propietario · falta agencia",
  firmado_agencia: "Firmó agencia · falta propietario",
  firmado: "✓ Firmado por ambas partes",
  cancelado: "Cancelado",
};

const ESTADO_COLOR: Record<string, string> = {
  borrador: "#9ca3af",
  pendiente_firmas: "#f59e0b",
  firmado_propietario: "#3b82f6",
  firmado_agencia: "#3b82f6",
  firmado: "#059669",
  cancelado: "#dc2626",
};

export default async function ContratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrato = await getContrato(id);
  if (!contrato) notFound();

  const signingLink = contrato.signing_token ? `${SITE_URL}/firmar/${contrato.signing_token}` : null;

  return (
    <section className="section admin">
      <div className="wrap">
        <AdminNav active="/admin/documentos" />

        <div style={{ marginBottom: 16 }}>
          <Link href="/admin/documentos/contratos" style={{ fontSize: "0.85rem", color: "var(--orange-dark)" }}>
            ← Volver a contratos
          </Link>
        </div>

        <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Contrato · {contrato.datos.propietario?.nombre || "Sin nombre"}</h2>
            <p>{contrato.datos.inmueble?.direccion || "Sin dirección"}</p>
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: "0.8rem",
              fontWeight: 500,
              background: `${ESTADO_COLOR[contrato.estado]}1a`,
              color: ESTADO_COLOR[contrato.estado],
            }}
          >
            {ESTADO_LABEL[contrato.estado]}
          </span>
        </div>

        <ContratoAcciones contratoId={contrato.id} estado={contrato.estado} signingLink={signingLink} />

        <div style={{ marginTop: 24, border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
          <ContratoRender contrato={contrato} showPlaceholders={true} />
        </div>
      </div>
    </section>
  );
}
