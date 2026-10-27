"use client";

import { useMemo, useState } from "react";
import { FONT, Media, Propiedad, totalConGaraje } from "./shared";
import { retocarFoto } from "../../../../lib/retoqueFoto";

const TIPO_LABEL: Record<string, string> = {
  piso: "Piso",
  casa: "Casa",
  estudio: "Estudio",
  chalet: "Chalet",
  venta_activo: "Activo en venta",
};

// Descripción para IG/TikTok generada a partir de los datos de la propiedad.
// Gratis (plantilla, sin IA) y editable por el usuario antes de copiar.
function construirCaption(p: Propiedad): string {
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

// Estado de retoque por foto: su blob retocado y qué versión usar.
type EstadoFoto = { blob?: Blob; objUrl?: string; usar: "orig" | "retoque" };

export function CompartirRedes({ p }: { p: Propiedad }) {
  const [abierto, setAbierto] = useState(false);
  const [caption, setCaption] = useState(() => construirCaption(p));
  const [copiado, setCopiado] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [estados, setEstados] = useState<Record<string, EstadoFoto>>({});
  const [preview, setPreview] = useState<Media | null>(null);
  const [retocando, setRetocando] = useState(false);

  const fotos = useMemo(() => p.media.filter((m) => m.tipo === "foto"), [p.media]);
  const videos = useMemo(() => p.media.filter((m) => m.tipo === "video"), [p.media]);

  // URL a usar para una foto según la versión elegida.
  function urlDe(m: Media): string {
    const e = estados[m.id];
    return e && e.usar === "retoque" && e.objUrl ? e.objUrl : m.url;
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

  async function retocar(m: Media) {
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

  function elegir(m: Media, usar: "orig" | "retoque") {
    setEstados((prev) => ({ ...prev, [m.id]: { ...prev[m.id], usar } }));
  }

  function descargar(m: Media) {
    const e = estados[m.id];
    const href = urlDe(m);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${p.nombre || "foto"}-${e && e.usar === "retoque" ? "retocada" : "original"}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function compartir(items: Media[], nombreBase: string) {
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
      if (files.length && nav.canShare && nav.canShare({ files })) {
        await nav.share({ files, text: caption } as ShareData);
      } else {
        setAviso(
          "Tu navegador no permite compartir directo. Ábrelo desde el móvil para enviar a Instagram/TikTok, o descarga las fotos una a una.",
        );
      }
    } catch {
      /* el usuario canceló el menú de compartir: sin error */
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
        <button type="button" onClick={() => setAbierto(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
      </div>

      {/* Galería: toca una foto para retocarla o descargarla */}
      {fotos.length > 0 && (
        <>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Fotos — toca una para retocarla (gratis) o descargarla</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8, marginTop: 6, marginBottom: 14 }}>
            {fotos.map((m) => {
              const e = estados[m.id];
              const esRetoque = e?.usar === "retoque" && e.objUrl;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreview(m)}
                  style={{ position: "relative", padding: 0, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "1 / 1", background: "#f3f4f6" }}
                  title="Ver / retocar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlDe(m)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {esRetoque && (
                    <span style={{ position: "absolute", top: 4, right: 4, background: "#16a34a", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4 }}>✨ retocada</span>
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
          onClick={() => setCaption(construirCaption(p))}
          style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}
        >
          ↺ Regenerar
        </button>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fotos.length > 0 && (
          <button
            type="button"
            onClick={() => compartir(fotos.slice(0, 15), "foto")}
            disabled={compartiendo}
            style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: compartiendo ? "wait" : "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {compartiendo ? "Preparando…" : `📸 Compartir ${fotos.length} foto${fotos.length !== 1 ? "s" : ""}`}
          </button>
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
        Desde el <b>móvil</b>: retoca las fotos que quieras, toca «Compartir fotos», elige <b>Instagram</b> o <b>TikTok</b>, añade el audio en tendencia y pega la descripción (ya copiada). Se comparte la versión elegida de cada foto.
      </p>

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
