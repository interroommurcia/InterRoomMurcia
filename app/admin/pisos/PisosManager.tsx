"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Piso } from "../../../lib/pisos";
import { supabase } from "../../../lib/supabaseClient";

const ZONAS_ALQUILER = [
  { slug: "ucam", label: "UCAM" },
  { slug: "umu", label: "UMU" },
  { slug: "upct", label: "UPCT" },
];

const PROVINCIAS = [
  { slug: "a-coruna", label: "A Coruña" },
  { slug: "alava", label: "Álava" },
  { slug: "albacete", label: "Albacete" },
  { slug: "alicante", label: "Alicante" },
  { slug: "almeria", label: "Almería" },
  { slug: "asturias", label: "Asturias" },
  { slug: "avila", label: "Ávila" },
  { slug: "badajoz", label: "Badajoz" },
  { slug: "barcelona", label: "Barcelona" },
  { slug: "burgos", label: "Burgos" },
  { slug: "caceres", label: "Cáceres" },
  { slug: "cadiz", label: "Cádiz" },
  { slug: "cantabria", label: "Cantabria" },
  { slug: "castellon", label: "Castellón" },
  { slug: "ceuta", label: "Ceuta" },
  { slug: "ciudad-real", label: "Ciudad Real" },
  { slug: "cordoba", label: "Córdoba" },
  { slug: "cuenca", label: "Cuenca" },
  { slug: "girona", label: "Girona" },
  { slug: "granada", label: "Granada" },
  { slug: "guadalajara", label: "Guadalajara" },
  { slug: "guipuzcoa", label: "Guipúzcoa" },
  { slug: "huelva", label: "Huelva" },
  { slug: "huesca", label: "Huesca" },
  { slug: "islas-baleares", label: "Islas Baleares" },
  { slug: "jaen", label: "Jaén" },
  { slug: "la-rioja", label: "La Rioja" },
  { slug: "las-palmas", label: "Las Palmas" },
  { slug: "leon", label: "León" },
  { slug: "lleida", label: "Lleida" },
  { slug: "lugo", label: "Lugo" },
  { slug: "madrid", label: "Madrid" },
  { slug: "malaga", label: "Málaga" },
  { slug: "melilla", label: "Melilla" },
  { slug: "murcia", label: "Murcia" },
  { slug: "navarra", label: "Navarra" },
  { slug: "ourense", label: "Ourense" },
  { slug: "palencia", label: "Palencia" },
  { slug: "pontevedra", label: "Pontevedra" },
  { slug: "salamanca", label: "Salamanca" },
  { slug: "santa-cruz-de-tenerife", label: "Santa Cruz de Tenerife" },
  { slug: "segovia", label: "Segovia" },
  { slug: "sevilla", label: "Sevilla" },
  { slug: "soria", label: "Soria" },
  { slug: "tarragona", label: "Tarragona" },
  { slug: "teruel", label: "Teruel" },
  { slug: "toledo", label: "Toledo" },
  { slug: "valencia", label: "Valencia" },
  { slug: "valladolid", label: "Valladolid" },
  { slug: "vizcaya", label: "Vizcaya" },
  { slug: "zamora", label: "Zamora" },
  { slug: "zaragoza", label: "Zaragoza" },
];

function SearchSelect({
  name,
  options,
  defaultValue,
  placeholder,
  label,
  resetKey,
}: {
  name: string;
  options: { slug: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  label: string;
  resetKey?: string;
}) {
  const initial = options.find((o) => o.slug === defaultValue);
  const [query, setQuery] = useState(initial?.label || "");
  const [selected, setSelected] = useState(defaultValue || "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevResetKey = useRef(resetKey);

  useEffect(() => {
    if (prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      setQuery("");
      setSelected("");
    }
  }, [resetKey]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const normalized = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const filtered = options.filter((o) =>
    o.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .includes(normalized),
  );

  return (
    <div className="pf-field" ref={ref} style={{ position: "relative" }}>
      <span className="pf-label">{label}</span>
      <input type="hidden" name={name} value={selected} />
      <input
        type="text"
        className="pf-input"
        placeholder={placeholder || "Buscar..."}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        required={!selected}
      />
      {open && filtered.length > 0 && (
        <ul className="pf-dropdown">
          {filtered.map((o) => (
            <li
              key={o.slug}
              className={`pf-dropdown-item${selected === o.slug ? " pf-dropdown-active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setSelected(o.slug);
                setQuery(o.label);
                setOpen(false);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && query && (
        <ul className="pf-dropdown">
          <li className="pf-dropdown-empty">Sin resultados</li>
        </ul>
      )}
    </div>
  );
}

export default function PisosManager({ pisos: pisosInit }: { pisos: Piso[] }) {
  const router = useRouter();
  const [pisos, setPisos] = useState<Piso[]>(pisosInit);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Piso | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [exito, setExito] = useState("");

  useEffect(() => {
    setPisos(pisosInit);
  }, [pisosInit]);

  async function cargarYEditar(piso: Piso) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pisos/${piso.id}`);
      if (!res.ok) throw new Error("No se pudo cargar el piso");
      const row = await res.json();
      setEditing({
        ...piso,
        descripcion: row.descripcion ?? "",
        metros: row.metros ?? null,
        gallery: Array.isArray(row.gallery) ? row.gallery : [],
        videoUrl: row.video_url ?? null,
        reservada: row.reservada ?? false,
      });
    } catch {
      setError("No se pudo cargar los datos del piso para editar.");
    } finally {
      setBusy(false);
    }
  }

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

  async function uploadFile(file: File): Promise<string> {
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    if (!res.ok) throw new Error("Error obteniendo URL de subida");
    const { token, path, publicUrl } = await res.json();
    const { error } = await supabase.storage
      .from("pisos")
      .uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (error) throw new Error("Error subiendo archivo a storage: " + error.message);
    return publicUrl;
  }

  async function uploadAndPrepare(formData: FormData) {
    const imagenFile = formData.get("imagen");
    if (imagenFile instanceof File && imagenFile.size > 0) {
      const url = await uploadFile(imagenFile);
      formData.delete("imagen");
      formData.set("imagen_url", url);
    } else {
      formData.delete("imagen");
    }

    const galeriaFiles = formData.getAll("galeria");
    const existingRaw = formData.get("galeria_existente");
    const existing: string[] = existingRaw ? JSON.parse(String(existingRaw)) : [];
    const galleryUrls = [...existing];
    for (const f of galeriaFiles) {
      if (f instanceof File && f.size > 0) {
        galleryUrls.push(await uploadFile(f));
      }
    }
    formData.delete("galeria");
    formData.delete("galeria_existente");
    if (galleryUrls.length > 0) formData.set("gallery_urls", JSON.stringify(galleryUrls));

    const videoFile = formData.get("video");
    if (videoFile instanceof File && videoFile.size > 0) {
      const url = await uploadFile(videoFile);
      formData.delete("video");
      formData.set("video_url", url);
    } else {
      formData.delete("video");
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    try {
      await uploadAndPrepare(formData);
      const res = await fetch("/api/admin/pisos", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setShowForm(false);
      formEl.reset();
      setExito("Guardado con éxito");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo guardar el piso.");
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
      await uploadAndPrepare(formData);
      const res = await fetch(`/api/admin/pisos/${id}`, { method: "PATCH", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setEditing(null);
      setExito("Guardado con éxito");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo actualizar el piso.");
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
      {exito && (
        <p className="lead-form-ok">
          {exito}
          <button type="button" className="btn-ghost" style={{ marginLeft: 12, fontSize: 13, padding: "2px 10px" }} onClick={() => setExito("")}>
            Aceptar
          </button>
        </p>
      )}
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
                    {piso.reservada ? " · Reservada" : !piso.disponible ? " · No disponible" : ""}
                    {" · "}
                    <span style={{ fontWeight: 500, color: piso.categoria === "compraventa" ? "#7c3aed" : "#059669" }}>
                      {piso.categoria === "compraventa" ? "Compraventa" : piso.tipoAlquiler === "habitacion" ? "Habitación" : "Piso completo"}
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
                  <button type="button" className="btn-ghost" onClick={() => cargarYEditar(piso)} disabled={busy}>
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
  const [tipoAlquiler, setTipoAlquiler] = useState(piso?.tipoAlquiler || "completo");
  const [galleryKeep, setGalleryKeep] = useState<string[]>(piso?.gallery ?? []);
  const [borrarVideo, setBorrarVideo] = useState(false);

  return (
    <>
      <div className="pf-row">
        {!isEdit && (
          <div className="pf-field">
            <span className="pf-label">Slug (URL)</span>
            <input className="pf-input" name="slug" required maxLength={80} placeholder="habitacion-centro-murcia" />
          </div>
        )}
        <div className="pf-field">
          <span className="pf-label">Título</span>
          <input className="pf-input" name="titulo" required maxLength={150} defaultValue={piso?.titulo} placeholder="Habitación en..." />
        </div>
      </div>

      <div className="pf-row">
        <div className="pf-field">
          <span className="pf-label">Categoría</span>
          <select
            className="pf-select"
            name="categoria"
            defaultValue={piso?.categoria || "alquiler"}
            onChange={(e) => setCategoria(e.target.value as "alquiler" | "compraventa")}
          >
            <option value="alquiler">Alquiler</option>
            <option value="compraventa">Compraventa</option>
          </select>
        </div>
        {!esCompraventa && (
          <div className="pf-field">
            <span className="pf-label">Tipo de alquiler</span>
            <select
              className="pf-select"
              name="tipo_alquiler"
              value={tipoAlquiler}
              onChange={(e) => setTipoAlquiler(e.target.value as "completo" | "habitacion")}
            >
              <option value="completo">Piso completo</option>
              <option value="habitacion">Habitación</option>
            </select>
          </div>
        )}
        {esCompraventa ? (
          <SearchSelect
            name="zona"
            options={PROVINCIAS}
            defaultValue={piso?.zona}
            placeholder="Escribe para buscar provincia..."
            label="Provincia"
            resetKey={categoria}
          />
        ) : (
          <div className="pf-field">
            <span className="pf-label">Zona (opcional)</span>
            <select className="pf-select" name="zona" defaultValue={piso?.zona || ""} key={categoria}>
              <option value="">— Sin zona —</option>
              {ZONAS_ALQUILER.map((z) => (
                <option key={z.slug} value={z.slug}>{z.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="pf-field">
          <span className="pf-label">Barrio / Localidad</span>
          <input className="pf-input" name="barrio" required maxLength={120} defaultValue={piso?.barrio} placeholder="El Carmen, Murcia" />
        </div>
      </div>

      <div className="pf-row">
        <div className="pf-field">
          <span className="pf-label">{esCompraventa ? "Precio del activo (€)" : "Precio/mes (€)"}</span>
          <input className="pf-input" name="precioMes" type="number" min={1} required defaultValue={piso?.precioMes} />
        </div>
        <div className="pf-field">
          <span className="pf-label">Metros cuadrados</span>
          <input className="pf-input" name="metros" type="number" min={0} defaultValue={piso?.metros ?? undefined} />
        </div>
      </div>

      <div className="pf-field">
        <span className="pf-label">Descripción</span>
        <textarea className="pf-textarea" name="descripcion" required rows={3} maxLength={2000} defaultValue={piso?.descripcion} />
      </div>

      <div className="pf-row">
        <div className="pf-field">
          <span className="pf-label">Estado</span>
          <select
            className="pf-select"
            name="estado"
            defaultValue={piso?.reservada ? "reservada" : (piso?.disponible ?? true) ? "disponible" : "no_disponible"}
          >
            <option value="disponible">Disponible</option>
            <option value="reservada">Reservada</option>
            <option value="no_disponible">No disponible</option>
          </select>
        </div>
        <div className="pf-field">
          <span className="pf-label">Foto principal {isEdit && "(deja vacío para no cambiarla)"}</span>
          <input className="pf-input pf-file" name="imagen" type="file" accept="image/*" />
        </div>
      </div>

      <div className="pf-field">
        <span className="pf-label">Galería de fotos {isEdit ? "(se añaden a las existentes)" : "(opcional, varias fotos)"}</span>
        {isEdit && galleryKeep.length > 0 && (
          <div className="pf-gallery-preview">
            {galleryKeep.map((url, i) => (
              <div key={i} className="pf-gallery-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} />
                <button
                  type="button"
                  className="pf-gallery-remove"
                  onClick={() => setGalleryKeep((prev) => prev.filter((_, j) => j !== i))}
                  title="Quitar foto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {isEdit && <input type="hidden" name="galeria_existente" value={JSON.stringify(galleryKeep)} />}
        <input className="pf-input pf-file" name="galeria" type="file" accept="image/*" multiple />
      </div>

      <div className="pf-field">
        <span className="pf-label">Vídeo {isEdit && "(deja vacío para no cambiarlo)"}</span>
        {isEdit && piso?.videoUrl && !borrarVideo && (
          <div className="pf-video-preview">
            <span className="pf-video-tag">Vídeo actual subido</span>
            <button type="button" className="btn-ghost" style={{ color: "#dc2626", fontSize: 13 }} onClick={() => setBorrarVideo(true)}>
              Quitar vídeo
            </button>
          </div>
        )}
        {borrarVideo && <input type="hidden" name="borrar_video" value="true" />}
        <input className="pf-input pf-file" name="video" type="file" accept="video/*" />
      </div>
    </>
  );
}
