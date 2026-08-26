"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Piso, ZonaSlug } from "../../../lib/pisos";

const ZONAS_ALQUILER: { slug: ZonaSlug; label: string }[] = [
  { slug: "ucam", label: "UCAM" },
  { slug: "umu", label: "UMU" },
  { slug: "upct", label: "UPCT" },
];

const ZONAS_COMPRAVENTA: { slug: ZonaSlug; label: string }[] = [
  { slug: "murcia", label: "Murcia" },
  { slug: "almeria", label: "Almería" },
  { slug: "andalucia", label: "Andalucía" },
  { slug: "comunidad-valenciana", label: "Comunidad Valenciana" },
  { slug: "madrid", label: "Madrid" },
];

export default function PisosManager({ pisos: pisosInit }: { pisos: Piso[] }) {
  const router = useRouter();
  const [pisos, setPisos] = useState<Piso[]>(pisosInit);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Piso | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    setPisos(pisosInit);
  }, [pisosInit]);

  function urlPublica(piso: Piso) {
    return `${window.location.origin}/habitaciones/${piso.zona}/${piso.slug}`;
  }

  async function handleCopiar(piso: Piso) {
    try {
      await navigator.clipboard.writeText(urlPublica(piso));
      setCopiado(piso.id);
      setTimeout(() => setCopiado((v) => (v === piso.id ? null : v)), 1500);
    } catch {
      setError("No se pudo copiar el enlace.");
    }
  }

  function handleWhatsapp(piso: Piso) {
    const texto = `Hola, échale un vistazo a esta habitación: ${piso.titulo} (${piso.barrio}) por ${piso.precioMes}€/mes. Info y fotos: ${urlPublica(piso)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    try {
      const res = await fetch("/api/admin/pisos", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      setShowForm(false);
      formEl.reset();
      router.refresh();
    } catch {
      setError("No se pudo guardar el piso. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/admin/pisos/${id}`, { method: "PATCH", body: formData });
      if (!res.ok) throw new Error();
      setEditing(null);
      router.refresh();
    } catch {
      setError("No se pudo actualizar el piso.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Borrar este piso del catálogo? No se puede deshacer.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/pisos/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setPisos((prev) => prev.filter((p) => p.id !== id));
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar el piso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pisos-manager">
      {error && <p className="lead-form-error">{error}</p>}

      <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancelar" : "+ Añadir piso"}
      </button>

      {showForm && (
        <form className="piso-form" onSubmit={handleCreate}>
          <PisoFields />
          <div className="lead-form-actions">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Guardando..." : "Guardar piso"}
            </button>
          </div>
        </form>
      )}

      <div className="pisos-list">
        {pisos.map((piso) => (
          <div className="pisos-list-item" key={piso.id}>
            {editing?.id === piso.id ? (
              <form className="piso-form" onSubmit={(e) => handleUpdate(e, piso.id)}>
                <PisoFields piso={piso} isEdit />
                <div className="lead-form-actions">
                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div
                  className="pisos-list-thumb"
                  style={piso.imageUrl ? { backgroundImage: `url(${piso.imageUrl})` } : undefined}
                />
                <div className="pisos-list-body">
                  <h4>{piso.titulo}</h4>
                  <div className="loc">
                    {piso.barrio} · {piso.zona.toUpperCase()} · {piso.precioMes}€{piso.categoria === "alquiler" ? "/mes" : ""}
                    {!piso.disponible && " · No disponible"}
                    {" · "}
                    <span style={{ fontWeight: 500, color: piso.categoria === "compraventa" ? "#7c3aed" : "#059669" }}>
                      {piso.categoria === "compraventa" ? "Compraventa" : "Alquiler"}
                    </span>
                  </div>
                </div>
                <div className="pisos-list-actions">
                  <button type="button" className="btn-ghost" onClick={() => handleCopiar(piso)}>
                    {copiado === piso.id ? "✓ Copiado" : "Copiar link"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => handleWhatsapp(piso)}>
                    WhatsApp
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setEditing(piso)}>
                    Editar
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => handleDelete(piso.id)} disabled={busy}>
                    Borrar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {pisos.length === 0 && <p className="admin-empty">Todavía no hay pisos en el catálogo.</p>}
      </div>
    </div>
  );
}

function PisoFields({ piso, isEdit }: { piso?: Piso; isEdit?: boolean }) {
  const [categoria, setCategoria] = useState<"alquiler" | "compraventa">(piso?.categoria || "alquiler");
  const esCompraventa = categoria === "compraventa";
  const zonasOptions = esCompraventa ? ZONAS_COMPRAVENTA : ZONAS_ALQUILER;

  return (
    <>
      <div className="lead-form-row">
        {!isEdit && (
          <label>
            Slug (URL)
            <input name="slug" required maxLength={80} placeholder="habitacion-centro-murcia" />
          </label>
        )}
        <label>
          Título
          <input name="titulo" required maxLength={150} defaultValue={piso?.titulo} placeholder="Habitación en..." />
        </label>
      </div>
      <div className="lead-form-row">
        <label>
          {esCompraventa ? "Provincia" : "Zona"}
          <select name="zona" required defaultValue={piso?.zona || ""} key={categoria}>
            <option value="" disabled>
              Selecciona...
            </option>
            {zonasOptions.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Barrio
          <input name="barrio" required maxLength={120} defaultValue={piso?.barrio} placeholder="El Carmen, Murcia" />
        </label>
      </div>
      <div className="lead-form-row">
        <label>
          Categoría
          <select
            name="categoria"
            defaultValue={piso?.categoria || "alquiler"}
            onChange={(e) => setCategoria(e.target.value as "alquiler" | "compraventa")}
          >
            <option value="alquiler">Alquiler</option>
            <option value="compraventa">Compraventa</option>
          </select>
        </label>
        <label>
          {esCompraventa ? "Precio del activo (€)" : "Precio/mes (€)"}
          <input name="precioMes" type="number" min={1} required defaultValue={piso?.precioMes} />
        </label>
        <label>
          Metros cuadrados
          <input name="metros" type="number" min={0} defaultValue={piso?.metros ?? undefined} />
        </label>
      </div>
      <label>
        Descripción
        <textarea name="descripcion" required rows={3} maxLength={2000} defaultValue={piso?.descripcion} />
      </label>
      <div className="lead-form-row">
        <label>
          Estado
          <select name="disponible" defaultValue={(piso?.disponible ?? true) ? "true" : "false"}>
            <option value="true">Disponible</option>
            <option value="false">No disponible</option>
          </select>
        </label>
        <label>
          Foto {isEdit && "(deja vacío para no cambiarla)"}
          <input name="imagen" type="file" accept="image/*" />
        </label>
      </div>
    </>
  );
}
