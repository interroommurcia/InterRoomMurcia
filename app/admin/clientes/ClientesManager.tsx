"use client";

import { useEffect, useState } from "react";
import { SITE_URL } from "../../../lib/site";

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  tipo: "propietario" | "estudiante" | "comprador" | "creditos";
  zona_interes: string | null;
  operacion: "alquiler" | "venta" | null;
  origen: "manual" | "lead" | "autocompletado";
  datos_completados: boolean;
  token: string;
  created_at: string;
};

const PREFIJOS = [
  { code: "+34", label: "España (+34)" },
  { code: "+351", label: "Portugal (+351)" },
  { code: "+33", label: "Francia (+33)" },
  { code: "+39", label: "Italia (+39)" },
  { code: "+49", label: "Alemania (+49)" },
  { code: "+44", label: "Reino Unido (+44)" },
  { code: "+353", label: "Irlanda (+353)" },
  { code: "+31", label: "Países Bajos (+31)" },
  { code: "+32", label: "Bélgica (+32)" },
  { code: "+41", label: "Suiza (+41)" },
  { code: "+43", label: "Austria (+43)" },
  { code: "+48", label: "Polonia (+48)" },
  { code: "+40", label: "Rumanía (+40)" },
  { code: "+30", label: "Grecia (+30)" },
  { code: "+36", label: "Hungría (+36)" },
  { code: "+420", label: "Chequia (+420)" },
  { code: "+380", label: "Ucrania (+380)" },
  { code: "+7", label: "Rusia (+7)" },
  { code: "+212", label: "Marruecos (+212)" },
  { code: "+213", label: "Argelia (+213)" },
  { code: "+216", label: "Túnez (+216)" },
  { code: "+1", label: "EE.UU. / Canadá (+1)" },
  { code: "+52", label: "México (+52)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+58", label: "Venezuela (+58)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+55", label: "Brasil (+55)" },
  { code: "+56", label: "Chile (+56)" },
  { code: "+51", label: "Perú (+51)" },
  { code: "+593", label: "Ecuador (+593)" },
  { code: "+86", label: "China (+86)" },
  { code: "+91", label: "India (+91)" },
];

const TIPOS: { value: Cliente["tipo"]; label: string }[] = [
  { value: "propietario", label: "Propietario" },
  { value: "estudiante", label: "Estudiante" },
  { value: "comprador", label: "Comprador Finalista" },
  { value: "creditos", label: "Cliente de Créditos" },
];

function labelTipo(tipo: Cliente["tipo"]) {
  return TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

const NUEVO_CLIENTE = {
  nombre: "",
  apellidos: "",
  telefonoPrefijo: "+34",
  telefonoNumero: "",
  email: "",
  tipo: "propietario" as Cliente["tipo"],
  zona_interes: "",
  operacion: "alquiler" as NonNullable<Cliente["operacion"]>,
};

export default function ClientesManager() {
  const [tab, setTab] = useState<Cliente["tipo"]>("propietario");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(NUEVO_CLIENTE);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function cargar() {
    const data = await fetch("/api/admin/clientes").then((r) => r.json());
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirFormulario() {
    setNuevoCliente({ ...NUEVO_CLIENTE, tipo: tab });
    setMostrarNuevoCliente((v) => !v);
  }

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoCliente.nombre.trim()) return;
    const telefono = nuevoCliente.telefonoNumero.trim() ? `${nuevoCliente.telefonoPrefijo} ${nuevoCliente.telefonoNumero.trim()}` : "";
    await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nuevoCliente.nombre,
        apellidos: nuevoCliente.apellidos,
        telefono,
        email: nuevoCliente.email,
        tipo: nuevoCliente.tipo,
        zona_interes: nuevoCliente.zona_interes,
        operacion: nuevoCliente.operacion,
      }),
    });
    setNuevoCliente({ ...NUEVO_CLIENTE, tipo: tab });
    setMostrarNuevoCliente(false);
    cargar();
  }

  async function eliminarCliente(id: string) {
    await fetch(`/api/admin/clientes/${id}`, { method: "DELETE" });
    cargar();
  }

  function copiarEnlace(token: string) {
    const url = `${SITE_URL}/completar-datos/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(token);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  const clientesDelTab = clientes.filter((c) => c.tipo === tab);
  const clientesFiltrados = clientesDelTab.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    const nombreCompleto = `${c.nombre} ${c.apellidos ?? ""}`.toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const telefonoDigits = (c.telefono ?? "").replace(/\D/g, "");
    return (
      nombreCompleto.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (qDigits.length > 0 && telefonoDigits.includes(qDigits))
    );
  });

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      <div className="contabilidad-tabs">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`contabilidad-tab${tab === t.value ? " active" : ""}`}
            onClick={() => {
              setTab(t.value);
              setMostrarNuevoCliente(false);
            }}
          >
            {t.label} ({clientes.filter((c) => c.tipo === t.value).length})
          </button>
        ))}
      </div>

      <div className="articulos-list-section" style={{ marginTop: 20 }}>
        <div className="section-head">
          <h2>
            {labelTipo(tab)} ({clientesFiltrados.length}/{clientesDelTab.length})
          </h2>
          <button type="button" className="btn-primary" onClick={abrirFormulario}>
            {mostrarNuevoCliente ? "Cancelar" : "Nuevo cliente"}
          </button>
        </div>

        <div className="lead-form-row" style={{ marginBottom: 16 }}>
          <label style={{ flex: 1 }}>
            Buscar por nombre, email o móvil
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Pepe, pepe@mail.com o 612345678" />
          </label>
        </div>

        {mostrarNuevoCliente && (
          <form className="piso-form" onSubmit={crearCliente}>
            <div className="lead-form-row">
              <label>
                Nombre
                <input required value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
              </label>
              <label>
                Apellidos
                <input value={nuevoCliente.apellidos} onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })} />
              </label>
            </div>
            <div className="lead-form-row">
              <label>
                Prefijo
                <select value={nuevoCliente.telefonoPrefijo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefonoPrefijo: e.target.value })}>
                  {PREFIJOS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Teléfono
                <input value={nuevoCliente.telefonoNumero} onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefonoNumero: e.target.value })} />
              </label>
              <label>
                Email
                <input type="email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
              </label>
            </div>
            <div className="lead-form-row">
              <label>
                Tipo
                <select value={nuevoCliente.tipo} onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo: e.target.value as Cliente["tipo"] })}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Zona de interés
                <input value={nuevoCliente.zona_interes} onChange={(e) => setNuevoCliente({ ...nuevoCliente, zona_interes: e.target.value })} />
              </label>
              <label>
                Operación
                <select value={nuevoCliente.operacion} onChange={(e) => setNuevoCliente({ ...nuevoCliente, operacion: e.target.value as NonNullable<Cliente["operacion"]> })}>
                  <option value="alquiler">Alquiler</option>
                  <option value="venta">Compraventa</option>
                </select>
              </label>
            </div>
            <div className="lead-form-actions">
              <button type="submit" className="btn-primary">
                Guardar cliente
              </button>
            </div>
          </form>
        )}

        {clientesFiltrados.length === 0 ? (
          <p className="admin-empty">{clientesDelTab.length === 0 ? "Todavía no hay clientes en esta sección." : "Sin resultados para esa búsqueda."}</p>
        ) : (
          clientesFiltrados.map((cliente) => (
            <div key={cliente.id} className="pisos-list-item">
              <div className="pisos-list-body">
                <h4>
                  {cliente.nombre} {cliente.apellidos}
                  {!cliente.datos_completados && cliente.origen !== "manual" && <span className="editor-badge-hidden"> · pendiente de rellenar</span>}
                </h4>
                <div className="loc">
                  {cliente.telefono || "sin teléfono"} · {cliente.email || "sin email"} · {cliente.zona_interes || "sin zona"} · {cliente.operacion || "—"}
                </div>
              </div>
              <div className="lead-form-actions" style={{ padding: "0 16px 12px" }}>
                <button type="button" className="btn-ghost" onClick={() => copiarEnlace(cliente.token)}>
                  {copiado === cliente.token ? "Enlace copiado" : "Copiar enlace de autorrelleno"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => eliminarCliente(cliente.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
