"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "../../../../../lib/contabilidad";
import type { DatosContratoGestion, ModeloComisionGestion } from "../../../../../lib/contratos";

const DEFAULT_DATOS: DatosContratoGestion = {
  propietario: { nombre: "", dni: "", direccion: "", telefono: "", email: "" },
  inmueble: {
    direccion: "",
    referencia_catastral: "",
    datos_registrales: "",
    superficie: "",
    cargas: "",
    estado_arrendaticio: "",
  },
  renta_mensual: 0,
  modelo_comision: "mensual_10",
  comision_pct: 10,
  comision_texto: "",
  duracion_meses: 3,
  servicios: {
    marketing: true,
    scoring: true,
    redaccion_arrendamiento: true,
    cobro_mensual: true,
  },
  agencia: {
    nombre: "InterRoom Murcia",
    cif: "",
    direccion: "",
    representante: "",
  },
};

const STORAGE_KEY = "ir_nuevo_contrato_gestion_draft_v1";

export default function NuevoContratoGestionForm() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [datos, setDatos] = useState<DatosContratoGestion>(DEFAULT_DATOS);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>("");
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { clienteId?: string; datos?: DatosContratoGestion };
        if (saved?.datos) setDatos({ ...DEFAULT_DATOS, ...saved.datos, servicios: { ...DEFAULT_DATOS.servicios, ...(saved.datos.servicios ?? {}) } });
        if (saved?.clienteId) setClienteId(saved.clienteId);
      }
    } catch {}
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ clienteId, datos }));
    } catch {}
  }, [clienteId, datos, hidratado]);

  useEffect(() => {
    fetch("/api/admin/clientes")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setClientes(d))
      .catch(() => {});
  }, []);

  function cargarCliente(id: string) {
    setClienteId(id);
    if (!id) return;
    const c = clientes.find((x) => x.id === id);
    if (!c) return;
    const nombreCompleto = `${c.nombre} ${c.apellidos ?? ""}`.trim();
    setDatos((prev) => ({
      ...prev,
      propietario: {
        nombre: nombreCompleto,
        dni: c.nif ?? prev.propietario.dni,
        direccion: [c.direccion, c.cp_ciudad].filter(Boolean).join(", ") || prev.propietario.direccion,
        telefono: c.telefono ?? prev.propietario.telefono,
        email: c.email ?? prev.propietario.email,
      },
    }));
  }

  function cambiarModeloComision(modelo: ModeloComisionGestion) {
    setDatos((p) => {
      let pct = p.comision_pct;
      if (modelo === "mensual_10") pct = 10;
      else if (modelo === "mensual_15") pct = 15;
      return { ...p, modelo_comision: modelo, comision_pct: pct };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!datos.propietario.nombre.trim()) {
      setError("Falta el nombre del propietario");
      return;
    }
    if (!datos.inmueble.direccion.trim()) {
      setError("Falta la dirección del inmueble");
      return;
    }
    if (!datos.renta_mensual || datos.renta_mensual <= 0) {
      setError("Introduce una renta mensual válida");
      return;
    }
    if (datos.modelo_comision === "manual" && !datos.comision_texto.trim()) {
      setError("Describe la comisión en el campo de texto libre");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/admin/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "gestion_alquiler",
          cliente_id: clienteId || null,
          datos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error desconocido");
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
      router.push(`/admin/documentos/contratos/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setGuardando(false);
    }
  }

  const updProp = (k: keyof DatosContratoGestion["propietario"], v: string) =>
    setDatos((p) => ({ ...p, propietario: { ...p.propietario, [k]: v } }));
  const updInm = (k: keyof DatosContratoGestion["inmueble"], v: string) =>
    setDatos((p) => ({ ...p, inmueble: { ...p.inmueble, [k]: v } }));
  const updAg = (k: keyof DatosContratoGestion["agencia"], v: string) =>
    setDatos((p) => ({ ...p, agencia: { ...p.agencia, [k]: v } }));
  const updServ = (k: keyof DatosContratoGestion["servicios"], v: boolean) =>
    setDatos((p) => ({ ...p, servicios: { ...p.servicios, [k]: v } }));

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Cargar cliente del CRM */}
      <div className="analytics-card">
        <h3>Cargar propietario del CRM</h3>
        <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "4px 0 12px" }}>
          Opcional: autocompleta los datos del propietario desde la ficha de un cliente.
        </p>
        <select
          value={clienteId}
          onChange={(e) => cargarCliente(e.target.value)}
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, width: "100%", maxWidth: 480 }}
        >
          <option value="">— Sin cargar (rellenar manual) —</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.apellidos ?? ""} {c.nif ? `· ${c.nif}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Propietario */}
      <div className="analytics-card">
        <h3>El Propietario</h3>
        <Grid>
          <Input label="Nombre completo" value={datos.propietario.nombre} onChange={(v) => updProp("nombre", v)} required />
          <Input label="DNI / NIF" value={datos.propietario.dni} onChange={(v) => updProp("dni", v)} required />
          <Input label="Domicilio" value={datos.propietario.direccion} onChange={(v) => updProp("direccion", v)} wide />
          <Input label="Teléfono" value={datos.propietario.telefono ?? ""} onChange={(v) => updProp("telefono", v)} />
          <Input label="Email" value={datos.propietario.email ?? ""} onChange={(v) => updProp("email", v)} type="email" />
        </Grid>
      </div>

      {/* Inmueble */}
      <div className="analytics-card">
        <h3>El Inmueble</h3>
        <Grid>
          <Input label="Dirección" value={datos.inmueble.direccion} onChange={(v) => updInm("direccion", v)} wide required />
          <Input label="Ref. catastral" value={datos.inmueble.referencia_catastral ?? ""} onChange={(v) => updInm("referencia_catastral", v)} />
          <Input label="Datos registrales" value={datos.inmueble.datos_registrales ?? ""} onChange={(v) => updInm("datos_registrales", v)} />
          <Input label="Superficie" value={datos.inmueble.superficie ?? ""} onChange={(v) => updInm("superficie", v)} placeholder="90 m² construidos / 85 m² útiles" />
          <Input label="Cargas" value={datos.inmueble.cargas ?? ""} onChange={(v) => updInm("cargas", v)} />
          <Input label="Estado actual" value={datos.inmueble.estado_arrendaticio ?? ""} onChange={(v) => updInm("estado_arrendaticio", v)} placeholder="Libre / Alquilado hasta…" />
        </Grid>
      </div>

      {/* Términos económicos */}
      <div className="analytics-card">
        <h3>Términos económicos</h3>
        <Grid>
          <InputNum label="Renta mensual (€)" value={datos.renta_mensual} onChange={(v) => setDatos((p) => ({ ...p, renta_mensual: v }))} required />
          <InputNum label="Duración (meses)" value={datos.duracion_meses} onChange={(v) => setDatos((p) => ({ ...p, duracion_meses: v }))} />
        </Grid>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "#666", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
            Modelo de comisión *
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ModeloChip active={datos.modelo_comision === "mensual_10"} label="10% + IVA mensual" onClick={() => cambiarModeloComision("mensual_10")} />
            <ModeloChip active={datos.modelo_comision === "mensual_15"} label="15% + IVA mensual" onClick={() => cambiarModeloComision("mensual_15")} />
            <ModeloChip active={datos.modelo_comision === "manual"} label="Manual (texto libre)" onClick={() => cambiarModeloComision("manual")} />
          </div>
          {datos.modelo_comision === "manual" && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#666", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Describe la comisión tal cual aparecerá en el contrato *
                </span>
                <textarea
                  value={datos.comision_texto}
                  onChange={(e) => setDatos((p) => ({ ...p, comision_texto: e.target.value }))}
                  rows={3}
                  placeholder="Ej.: una mensualidad al alta + 7% + IVA sobre la renta mensual durante toda la vigencia"
                  style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: "0.95rem", fontFamily: "inherit" }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Servicios incluidos */}
      <div className="analytics-card">
        <h3>Servicios incluidos</h3>
        <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "4px 0 10px" }}>
          Solo aparecerán en el contrato los servicios marcados.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Check label="Publicación y marketing del inmueble" checked={datos.servicios.marketing} onChange={(v) => updServ("marketing", v)} />
          <Check label="Visitas y selección de inquilino con scoring de solvencia" checked={datos.servicios.scoring} onChange={(v) => updServ("scoring", v)} />
          <Check label="Redacción y firma del contrato de arrendamiento (y fianza)" checked={datos.servicios.redaccion_arrendamiento} onChange={(v) => updServ("redaccion_arrendamiento", v)} />
          <Check label="Cobro mensual, remesa al propietario e incidencias 24/7" checked={datos.servicios.cobro_mensual} onChange={(v) => updServ("cobro_mensual", v)} />
        </div>
      </div>

      {/* Agencia */}
      <div className="analytics-card">
        <h3>La Agencia</h3>
        <Grid>
          <Input label="Razón social" value={datos.agencia.nombre} onChange={(v) => updAg("nombre", v)} />
          <Input label="CIF / NIF" value={datos.agencia.cif} onChange={(v) => updAg("cif", v)} />
          <Input label="Domicilio profesional" value={datos.agencia.direccion} onChange={(v) => updAg("direccion", v)} wide />
          <Input label="Representante" value={datos.agencia.representante} onChange={(v) => updAg("representante", v)} />
        </Grid>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            if (!confirm("¿Vaciar todos los campos del formulario?")) return;
            try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
            setDatos(DEFAULT_DATOS);
            setClienteId("");
            setError("");
          }}
          style={{ padding: "10px 20px", border: "1px solid #ddd", background: "#fff", borderRadius: 8, cursor: "pointer" }}
        >
          Vaciar formulario
        </button>
        <button
          type="button"
          onClick={() => history.back()}
          style={{ padding: "10px 20px", border: "1px solid #ddd", background: "#fff", borderRadius: 8, cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          style={{
            padding: "10px 24px",
            background: "var(--orange)",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 500,
            cursor: guardando ? "wait" : "pointer",
            opacity: guardando ? 0.6 : 1,
          }}
        >
          {guardando ? "Guardando…" : "Crear borrador"}
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 14,
        marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  wide,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  wide?: boolean;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: wide ? "1 / -1" : undefined }}>
      <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#666", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label} {required && <span style={{ color: "var(--orange)" }}>*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: "0.95rem" }}
      />
    </label>
  );
}

function InputNum({
  label,
  value,
  onChange,
  step = 1,
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  required?: boolean;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#666", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label} {required && <span style={{ color: "var(--orange)" }}>*</span>}
      </span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        step={step}
        required={required}
        style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: "0.95rem" }}
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.9rem", color: "#374151" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ModeloChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1.5px solid ${active ? "var(--orange)" : "#ddd"}`,
        background: active ? "var(--orange)" : "#fff",
        color: active ? "#fff" : "#374151",
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
