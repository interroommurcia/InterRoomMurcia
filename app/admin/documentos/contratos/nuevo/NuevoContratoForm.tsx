"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "../../../../../lib/contabilidad";
import type { DatosContratoExclusiva } from "../../../../../lib/contratos";

const DEFAULT_DATOS: DatosContratoExclusiva = {
  propietario: { nombre: "", dni: "", direccion: "", telefono: "", email: "" },
  inmueble: {
    direccion: "",
    referencia_catastral: "",
    datos_registrales: "",
    superficie: "",
    cargas: "",
    estado_arrendaticio: "",
  },
  precio_venta: 0,
  duracion_meses: 4,
  comision_pct: 1.5,
  penalizacion_pct: 75,
  agencia: {
    nombre: "InterRoom Murcia",
    cif: "",
    direccion: "",
    representante: "",
  },
};

const STORAGE_KEY = "ir_nuevo_contrato_draft_v1";

export default function NuevoContratoForm() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [datos, setDatos] = useState<DatosContratoExclusiva>(DEFAULT_DATOS);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>("");
  const [hidratado, setHidratado] = useState(false);

  // Rehidratar borrador local al montar
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { clienteId?: string; datos?: DatosContratoExclusiva };
        if (saved?.datos) setDatos({ ...DEFAULT_DATOS, ...saved.datos });
        if (saved?.clienteId) setClienteId(saved.clienteId);
      }
    } catch {}
    setHidratado(true);
  }, []);

  // Guardar en sessionStorage cada vez que cambian los datos
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validación mínima
    if (!datos.propietario.nombre.trim()) {
      setError("Falta el nombre del propietario");
      return;
    }
    if (!datos.inmueble.direccion.trim()) {
      setError("Falta la dirección del inmueble");
      return;
    }
    if (!datos.precio_venta || datos.precio_venta <= 0) {
      setError("Precio de venta inválido");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/admin/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId || null, datos }),
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

  const upd = <K extends keyof DatosContratoExclusiva>(k: K, v: DatosContratoExclusiva[K]) =>
    setDatos((p) => ({ ...p, [k]: v }));
  const updProp = (k: keyof DatosContratoExclusiva["propietario"], v: string) =>
    setDatos((p) => ({ ...p, propietario: { ...p.propietario, [k]: v } }));
  const updInm = (k: keyof DatosContratoExclusiva["inmueble"], v: string) =>
    setDatos((p) => ({ ...p, inmueble: { ...p.inmueble, [k]: v } }));
  const updAg = (k: keyof DatosContratoExclusiva["agencia"], v: string) =>
    setDatos((p) => ({ ...p, agencia: { ...p.agencia, [k]: v } }));

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
          <Input label="Cargas" value={datos.inmueble.cargas ?? ""} onChange={(v) => updInm("cargas", v)} placeholder="Libre de cargas / Hipoteca con X por Y €" />
          <Input label="Arrendamiento" value={datos.inmueble.estado_arrendaticio ?? ""} onChange={(v) => updInm("estado_arrendaticio", v)} placeholder="Libre de arrendatarios" />
        </Grid>
      </div>

      {/* Términos */}
      <div className="analytics-card">
        <h3>Términos económicos</h3>
        <Grid>
          <InputNum label="Precio de venta (€)" value={datos.precio_venta} onChange={(v) => upd("precio_venta", v)} required />
          <InputNum label="Duración (meses)" value={datos.duracion_meses} onChange={(v) => upd("duracion_meses", v)} />
          <InputNum label="Comisión (%)" value={datos.comision_pct} onChange={(v) => upd("comision_pct", v)} step={0.1} />
          <InputNum label="Penalización incumplimiento (%)" value={datos.penalizacion_pct} onChange={(v) => upd("penalizacion_pct", v)} />
        </Grid>
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
