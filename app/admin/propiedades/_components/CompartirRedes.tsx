"use client";

import { useState } from "react";
import { FONT, Propiedad, totalConGaraje } from "./shared";
import type { Piso } from "../../../../lib/pisos";
import { retocarFoto } from "../../../../lib/retoqueFoto";
import { GenerarReel } from "./GenerarReel";
import { GenerarHistoria } from "./GenerarHistoria";

// Media normalizada que consume el panel (vale para propiedades y para pisos).
type ItemMedia = { id: string; url: string };

const TIPO_LABEL: Record<string, string> = {
  piso: "Piso",
  casa: "Casa",
  estudio: "Estudio",
  chalet: "Chalet",
  venta_activo: "Activo en venta",
};

// Descripción para IG/TikTok generada a partir de los datos de la propiedad.
// Gratis (plantilla, sin IA) y editable por el usuario antes de copiar.
function construirCaptionPropiedad(p: Propiedad): string {
  const esVenta = p.tipo === "venta_activo";
  const tipoLabel = TIPO_LABEL[p.tipo] ?? p.tipo;
  const precio = totalConGaraje(p);
  const zona = (p.direccion ?? "").trim() || "Murcia";
  const servicios = [
    p.servicio_wifi && "Wifi",
    p.servicio_limpieza && "Limpieza",
    p.servicio_luz && "Luz",
    p.servicio_agua && "Agua",
  ].filter(Boolean) as string[];

  const specs: string[] = [];
  if (p.num_habitaciones) specs.push(`🛏️ ${p.num_habitaciones} hab`);
  if (p.num_banos) specs.push(`🚿 ${p.num_banos} baño${p.num_banos !== 1 ? "s" : ""}`);

  const hashtags = [
    "#Murcia",
    "#InterRoomMurcia",
    "#inmobiliaria",
    ...(esVenta
      ? ["#casasenventa", "#compraMurcia", "#inversioninmobiliaria"]
      : ["#alquilerMurcia", "#pisosMurcia", "#habitacionesMurcia", "#alquiler"]),
  ].join(" ");

  const lineas: string[] = [];
  lineas.push(`🏡 ${tipoLabel} en ${zona}`);
  if (specs.length) lineas.push(specs.join("  ·  "));
  if (precio) lineas.push(`💶 ${precio.toLocaleString("es-ES")}€${esVenta ? "" : "/mes"}`);
  if (servicios.length) lineas.push(`✨ Incluye: ${servicios.join(", ")}`);
  if (p.tiene_garaje) lineas.push("🚗 Plaza de garaje");
  lineas.push("");
  lineas.push("📲 Más info y más propiedades 👉 interroommurcia.com");
  lineas.push("📞 Escríbenos y te la enseñamos.");
  lineas.push("");
  lineas.push(hashtags);
  return lineas.join("\n");
}

// Descripción para IG/TikTok a partir de un piso del catálogo (mismo estilo).
function construirCaptionPiso(p: Piso): string {
  const esVenta = p.categoria === "compraventa";
  const zonaTxt = (p.barrio ?? "").trim() || "Murcia";

  const specs: string[] = [];
  if (p.numHabitaciones) specs.push(`🛏️ ${p.numHabitaciones} hab`);
  if (p.numBanos) specs.push(`🚿 ${p.numBanos} baño${p.numBanos !== 1 ? "s" : ""}`);
  if (p.metros) specs.push(`📐 ${p.metros} m²`);

  const extras = [p.terraza && "Terraza", p.piscina && "Piscina", p.garaje && "Garaje"].filter(Boolean) as string[];

  const hashtags = [
    "#Murcia",
    "#InterRoomMurcia",
    "#inmobiliaria",
    ...(esVenta
      ? ["#casasenventa", "#compraMurcia", "#inversioninmobiliaria"]
      : ["#alquilerMurcia", "#pisosMurcia", "#habitacionesMurcia", "#alquiler"]),
  ].join(" ");

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/habitaciones/${p.zona}/${p.slug}`
      : "interroommurcia.com";

  const lineas: string[] = [];
  lineas.push(`🏡 ${p.titulo}`);
  if (specs.length) lineas.push(specs.join("  ·  "));
  if (p.precioMes) lineas.push(`💶 ${p.precioMes.toLocaleString("es-ES")}€${esVenta ? "" : "/mes"}`);
  if (extras.length) lineas.push(`✨ ${extras.join(", ")}`);
  lineas.push(`📍 ${zonaTxt}`);
  lineas.push("");
  lineas.push(`📲 Más info y fotos 👉 ${link}`);
  lineas.push("📞 Escríbenos y te la enseñamos.");
  lineas.push("");
  lineas.push(hashtags);
  return lineas.join("\n");
}

// Estado de retoque por foto: su blob retocado y qué versión usar.
type EstadoFoto = { blob?: Blob; objUrl?: string; usar: "orig" | "retoque" };

// Adaptador para una propiedad (ficha de propiedades). Conserva el uso previo.
export function CompartirRedes({ p }: { p: Propiedad }) {
  const fotos = p.media.filter((m) => m.tipo === "foto").map((m) => ({ id: m.id, url: m.url }));
  const videos = p.media.filter((m) => m.tipo === "video").map((m) => ({ id: m.id, url: m.url }));
  const precio = totalConGaraje(p);
  const textoPrecio = precio ? `${precio.toLocaleString("es-ES")}€${p.tipo === "venta_activo" ? "" : "/mes"}` : "";
  const textoZona = (p.direccion ?? "").trim() || "Murcia";
  const titulo = p.nombre || `${TIPO_LABEL[p.tipo] ?? p.tipo} en ${textoZona}`;
  const incluye: string[] = [];
  if (p.num_habitaciones) incluye.push(`${p.num_habitaciones} habitaciones`);
  if (p.num_banos) incluye.push(`${p.num_banos} baño${p.num_banos !== 1 ? "s" : ""}`);
  if (p.servicio_wifi) incluye.push("Wifi");
  if (p.servicio_limpieza) incluye.push("Limpieza");
  if (p.servicio_luz) incluye.push("Luz");
  if (p.servicio_agua) incluye.push("Agua");
  if (p.tiene_garaje) incluye.push("Plaza de garaje");
  return (
    <CompartirRedesCore
      nombre={p.nombre}
      fotos={fotos}
      videos={videos}
      construirCaption={() => construirCaptionPropiedad(p)}
      textoPrecio={textoPrecio}
      textoZona={textoZona}
      titulo={titulo}
      incluye={incluye}
    />
  );
}

// Adaptador para un piso del catálogo. Se abre directo (panel inline) y se cierra con onCerrar.
export function CompartirRedesPiso({ piso, onCerrar }: { piso: Piso; onCerrar?: () => void }) {
  const fotos = [piso.imageUrl, ...piso.gallery]
    .filter((u): u is string => Boolean(u))
    .map((url, i) => ({ id: `f${i}`, url }));
  const videos = piso.videoUrl ? [{ id: "v0", url: piso.videoUrl }] : [];
  const esVenta = piso.categoria === "compraventa";
  const textoPrecio = piso.precioMes ? `${piso.precioMes.toLocaleString("es-ES")}€${esVenta ? "" : "/mes"}` : "";
  const textoZona = (piso.barrio ?? "").trim() || "Murcia";
  const incluye: string[] = [];
  if (piso.numHabitaciones) incluye.push(`${piso.numHabitaciones} habitaciones`);
  if (piso.numBanos) incluye.push(`${piso.numBanos} baño${piso.numBanos !== 1 ? "s" : ""}`);
  if (piso.metros) incluye.push(`${piso.metros} m²`);
  if (piso.terraza) incluye.push("Terraza");
  if (piso.piscina) incluye.push("Piscina");
  if (piso.garaje) incluye.push("Garaje");
  return (
    <CompartirRedesCore
      nombre={piso.slug || piso.titulo}
      fotos={fotos}
      videos={videos}
      construirCaption={() => construirCaptionPiso(piso)}
      textoPrecio={textoPrecio}
      textoZona={textoZona}
      titulo={piso.titulo}
      incluye={incluye}
      defaultAbierto
      onCerrar={onCerrar}
    />
  );
}

function CompartirRedesCore({
  nombre,
  fotos,
  videos,
  construirCaption,
  textoPrecio,
  textoZona,
  titulo,
  incluye,
  defaultAbierto = false,
  onCerrar,
}: {
  nombre: string;
  fotos: ItemMedia[];
  videos: ItemMedia[];
  construirCaption: () => string;
  textoPrecio: string;
  textoZona: string;
  titulo: string;
  incluye: string[];
  defaultAbierto?: boolean;
  onCerrar?: () => void;
}) {
  const [abierto, setAbierto] = useState(defaultAbierto);
  const [caption, setCaption] = useState(() => construirCaption());
  const [copiado, setCopiado] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [estados, setEstados] = useState<Record<string, EstadoFoto>>({});
  const [preview, setPreview] = useState<ItemMedia | null>(null);
  const [retocando, setRetocando] = useState(false);
  // Fotos marcadas para compartir/descargar (por defecto todas).
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(fotos.map((f) => f.id)));

  const fotosSel = fotos.filter((f) => seleccion.has(f.id));

  function toggleSel(id: string) {
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function todas(marcar: boolean) {
    setSeleccion(marcar ? new Set(fotos.map((f) => f.id)) : new Set());
  }

  // URL a usar para una foto según la versión elegida.
  function urlDe(m: ItemMedia): string {
    const e = estados[m.id];
    return e && e.usar === "retoque" && e.objUrl ? e.objUrl : m.url;
  }

  // Descarga secuencial de las fotos seleccionadas (para montar el carrusel a mano en IG).
  async function descargarSeleccionadas() {
    if (!fotosSel.length) return;
    setAviso("");
    for (let i = 0; i < fotosSel.length; i++) {
      descargar(fotosSel[i], i + 1);
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setAviso("No se pudo copiar automáticamente. Selecciona el texto y cópialo a mano.");
    }
  }

  async function retocar(m: ItemMedia) {
    setRetocando(true);
    setAviso("");
    try {
      const blob = await retocarFoto(m.url);
      const objUrl = URL.createObjectURL(blob);
      setEstados((prev) => {
        const anterior = prev[m.id];
        if (anterior?.objUrl) URL.revokeObjectURL(anterior.objUrl);
        return { ...prev, [m.id]: { blob, objUrl, usar: "retoque" } };
      });
    } catch {
      setAviso("No se pudo retocar esta foto. Prueba con otra o compártela sin retocar.");
    } finally {
      setRetocando(false);
    }
  }

  function elegir(m: ItemMedia, usar: "orig" | "retoque") {
    setEstados((prev) => ({ ...prev, [m.id]: { ...prev[m.id], usar } }));
  }

  function descargar(m: ItemMedia, n?: number) {
    const e = estados[m.id];
    const href = urlDe(m);
    const sufijo = n != null ? `-${String(n).padStart(2, "0")}` : e && e.usar === "retoque" ? "-retocada" : "-original";
    const a = document.createElement("a");
    a.href = href;
    a.download = `${nombre || "foto"}${sufijo}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function compartir(items: ItemMedia[], nombreBase: string) {
    setAviso("");
    setCompartiendo(true);
    try {
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const m = items[i];
          const e = estados[m.id];
          let blob: Blob;
          if (nombreBase === "foto" && e && e.usar === "retoque" && e.blob) {
            blob = e.blob;
          } else {
            const r = await fetch(m.url);
            blob = await r.blob();
          }
          const ext = (blob.type.split("/")[1] || (nombreBase === "video" ? "mp4" : "jpg")).split(";")[0];
          files.push(new File([blob], `${nombreBase}-${i + 1}.${ext}`, { type: blob.type || "image/jpeg" }));
        } catch {
          /* salta el que falle */
        }
      }
      const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
      if (!files.length) {
        setAviso("No hay nada seleccionado para compartir.");
        return;
      }
      if (!nav.canShare || !nav.canShare({ files })) {
        setAviso(
          nombreBase === "foto" && files.length > 1
            ? "Tu móvil no deja mandar varias fotos a Instagram de golpe (Instagram no acepta carruseles por aquí). Usa «⬇️ Descargar seleccionadas» y súbelas en la app de Instagram, o comparte de una en una."
            : "Tu navegador no permite compartir directo. Ábrelo desde el móvil para enviar a Instagram/TikTok.",
        );
        return;
      }
      await nav.share({ files, text: caption } as ShareData);
    } catch (err) {
      // AbortError = el usuario cerró el menú de compartir: no es un fallo.
      if (err instanceof Error && err.name === "AbortError") return;
      setAviso(
        nombreBase === "foto" && items.length > 1
          ? "Instagram no admite varias fotos a la vez por el menú de compartir. Usa «⬇️ Descargar seleccionadas» y monta el carrusel en la app, o comparte de una en una."
          : "No se pudo abrir el menú de compartir. Prueba desde el móvil o descarga el archivo.",
      );
    } finally {
      setCompartiendo(false);
    }
  }

  if (!abierto) {
    return (
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(90deg,#f09433,#dc2743,#bc1888)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: FONT,
          }}
        >
          📲 Compartir en Instagram / TikTok
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Compartir en redes</div>
        <button type="button" onClick={() => { setAbierto(false); onCerrar?.(); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
      </div>

      {/* Galería: toca una foto para retocarla o descargarla */}
      {fotos.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
              Fotos — marca ✓ las que quieras · toca la foto para retocarla
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => todas(true)} style={{ background: "none", border: "none", color: "var(--orange)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}>Todas</button>
              <button type="button" onClick={() => todas(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}>Ninguna</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8, marginTop: 6, marginBottom: 14 }}>
            {fotos.map((m) => {
              const e = estados[m.id];
              const esRetoque = e?.usar === "retoque" && e.objUrl;
              const sel = seleccion.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreview(m)}
                  style={{ position: "relative", padding: 0, border: `2px solid ${sel ? "var(--orange)" : "#e5e7eb"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "1 / 1", background: "#f3f4f6" }}
                  title="Ver / retocar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlDe(m)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: sel ? 1 : 0.4 }} />
                  <span
                    onClick={(ev) => { ev.stopPropagation(); toggleSel(m.id); }}
                    title={sel ? "Quitar de la selección" : "Añadir a la selección"}
                    style={{ position: "absolute", top: 4, left: 4, width: 22, height: 22, borderRadius: 6, border: "2px solid #fff", background: sel ? "var(--orange)" : "rgba(0,0,0,0.4)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", cursor: "pointer" }}
                  >
                    {sel ? "✓" : ""}
                  </span>
                  {esRetoque && (
                    <span style={{ position: "absolute", top: 4, right: 4, background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4 }}>✨</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Descripción (edítala si quieres)</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={10}
        style={{ width: "100%", marginTop: 4, padding: 10, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: FONT, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button
          type="button"
          onClick={copiar}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
        >
          {copiado ? "✓ Copiado" : "📋 Copiar descripción"}
        </button>
        <button
          type="button"
          onClick={() => setCaption(construirCaption())}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}
        >
          ↺ Regenerar
        </button>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fotos.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => descargarSeleccionadas()}
              disabled={!fotosSel.length}
              style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: fotosSel.length ? "pointer" : "not-allowed", opacity: fotosSel.length ? 1 : 0.5, fontSize: 13, fontWeight: 600 }}
            >
              ⬇️ Descargar {fotosSel.length} seleccionada{fotosSel.length !== 1 ? "s" : ""}
            </button>
            <button
              type="button"
              onClick={() => compartir(fotosSel, "foto")}
              disabled={compartiendo || !fotosSel.length}
              style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: compartiendo || !fotosSel.length ? "not-allowed" : "pointer", opacity: fotosSel.length ? 1 : 0.5, fontSize: 13, fontWeight: 600 }}
            >
              {compartiendo ? "Preparando…" : `📲 Compartir (${fotosSel.length})`}
            </button>
          </>
        )}
        {videos.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => compartir([v], "video")}
            disabled={compartiendo}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: compartiendo ? "wait" : "pointer", fontSize: 13, fontWeight: 500 }}
          >
            🎬 Compartir vídeo{videos.length > 1 ? ` ${i + 1}` : ""}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 12, lineHeight: 1.5 }}>
        <b>Carrusel de Instagram:</b> Instagram no deja mandar varias fotos a la vez por el menú de compartir. Marca las fotos, pulsa <b>«⬇️ Descargar seleccionadas»</b>, abre Instagram y elige esas fotos de la galería para el carrusel. Pega la descripción (ya copiada) y añade el audio en tendencia.<br />
        <b>«📲 Compartir»</b> va bien para <b>1 foto, una historia o el vídeo</b>.
      </p>

      <GenerarHistoria nombre={nombre} fotos={fotos} titulo={titulo} textoPrecio={textoPrecio} incluye={incluye} />

      <GenerarReel nombre={nombre} videos={videos} textoPrecio={textoPrecio} textoZona={textoZona} />

      {aviso && <p style={{ fontSize: 12, color: "#b45309", background: "#fffbeb", padding: 8, borderRadius: 6, marginTop: 8 }}>{aviso}</p>}

      {/* Preview de una foto con retoque antes/después */}
      {preview && (() => {
        const e = estados[preview.id];
        const tieneRetoque = Boolean(e?.objUrl);
        const mostrando: "orig" | "retoque" = e?.usar === "retoque" && e.objUrl ? "retoque" : "orig";
        return (
          <div
            onClick={() => setPreview(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <div onClick={(ev) => ev.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 520, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ position: "relative", background: "#111", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mostrando === "retoque" && e?.objUrl ? e.objUrl : preview.url} alt="" style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", display: "block" }} />
                <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
                  {mostrando === "retoque" ? "✨ Retocada" : "Original"}
                </span>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {!tieneRetoque ? (
                  <button
                    type="button"
                    onClick={() => retocar(preview)}
                    disabled={retocando}
                    style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: retocando ? "wait" : "pointer", fontSize: 14, fontWeight: 600 }}
                  >
                    {retocando ? "Retocando…" : "✨ Retocar (auto, gratis)"}
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => elegir(preview, "orig")}
                      style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${mostrando === "orig" ? "#111827" : "#d1d5db"}`, background: mostrando === "orig" ? "#111827" : "#fff", color: mostrando === "orig" ? "#fff" : "#333", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => elegir(preview, "retoque")}
                      style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${mostrando === "retoque" ? "#16a34a" : "#d1d5db"}`, background: mostrando === "retoque" ? "#16a34a" : "#fff", color: mostrando === "retoque" ? "#fff" : "#333", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                    >
                      ✨ Retocada
                    </button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => descargar(preview)}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                  >
                    ⬇️ Descargar esta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
