"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Piso, Zona } from "../../../lib/pisos";

const ZONAS: { slug: Zona["slug"]; label: string }[] = [
  { slug: "ucam", label: "UCAM" },
  { slug: "umu", label: "UMU" },
  { slug: "upct", label: "UPCT" },
];

export default function PisosManager({ pisos }: { pisos: Piso[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Piso | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("No se pudo borrar el piso.");
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
                    {piso.barrio} · {piso.zona.toUpperCase()} · {piso.precioMes}€/mes
                    {!piso.disponible && " · No disponible"}
                  </div>
                </div>
                <div className="pisos-list-actions">
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
          Zona
          <select name="zona" required defaultValue={piso?.zona || ""}>
            <option value="" disabled>
              Selecciona...
            </option>
            {ZONAS.map((z) => (
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
          Precio/mes (€)
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
