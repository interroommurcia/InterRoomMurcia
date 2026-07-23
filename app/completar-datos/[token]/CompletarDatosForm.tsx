"use client";

import { useState } from "react";

type Inicial = {
  nombre: string;
  apellidos: string;
  telefono: string;
  tipo: string;
  zona_interes: string;
  operacion: string;
};

export default function CompletarDatosForm({
  token,
  inicial,
  yaCompletado,
}: {
  token: string;
  inicial: Inicial;
  yaCompletado: boolean;
}) {
  const [form, setForm] = useState(inicial);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(yaCompletado ? "sent" : "idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`/api/clientes/completar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="lead-sent">
        <h3>Datos guardados</h3>
        <p>Gracias, ya tenemos tus datos actualizados.</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <div className="lead-form-row">
        <label>
          Nombre
          <input required maxLength={120} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>
          Apellidos
          <input maxLength={120} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
        </label>
      </div>
      <label>
        Teléfono de contacto
        <input required maxLength={30} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
      </label>
      <label>
        ¿Qué eres?
        <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
          <option value="">Selecciona...</option>
          <option value="propietario">Propietario</option>
          <option value="estudiante">Estudiante / inquilino</option>
          <option value="comprador">Comprador</option>
        </select>
      </label>
      <label>
        Zona de interés
        <input maxLength={200} value={form.zona_interes} onChange={(e) => setForm({ ...form, zona_interes: e.target.value })} placeholder="Barrio o zona en Murcia o Cartagena" />
      </label>
      <label>
        ¿Alquiler o compraventa?
        <select value={form.operacion} onChange={(e) => setForm({ ...form, operacion: e.target.value })}>
          <option value="">Selecciona...</option>
          <option value="alquiler">Alquiler</option>
          <option value="venta">Compraventa</option>
        </select>
      </label>
      <div className="lead-form-actions">
        <button type="submit" className="btn-primary" disabled={status === "sending"}>
          {status === "sending" ? "Guardando..." : "Guardar mis datos"}
        </button>
      </div>
      {status === "error" && <p className="lead-form-error">No se pudo guardar. Inténtalo de nuevo.</p>}
    </form>
  );
}
