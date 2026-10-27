"use client";

import { useMemo, useState } from "react";
import { FONT, Propiedad, totalConGaraje } from "./shared";

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

export function CompartirRedes({ p }: { p: Propiedad }) {
  const [abierto, setAbierto] = useState(false);
  const [caption, setCaption] = useState(() => construirCaption(p));
  const [copiado, setCopiado] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [aviso, setAviso] = useState("");

  const fotos = useMemo(() => p.media.filter((m) => m.tipo === "foto"), [p.media]);
  const videos = useMemo(() => p.media.filter((m) => m.tipo === "video"), [p.media]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setAviso("No se pudo copiar automáticamente. Selecciona el texto y cópialo a mano.");
    }
  }

  async function compartir(items: typeof fotos, nombreBase: string) {
    setAviso("");
    setCompartiendo(true);
    try {
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const r = await fetch(items[i].url);
          const b = await r.blob();
          const ext = (b.type.split("/")[1] || (nombreBase === "video" ? "mp4" : "jpg")).split(";")[0];
          files.push(new File([b], `${nombreBase}-${i + 1}.${ext}`, { type: b.type || "image/jpeg" }));
        } catch {
          /* salta el que falle */
        }
      }
      const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
      if (files.length && nav.canShare && nav.canShare({ files })) {
        await nav.share({ files, text: caption } as ShareData);
      } else {
        setAviso(
          "Tu navegador no permite compartir directo. Ábrelo desde el móvil para enviar a Instagram/TikTok, o descarga las fotos tocándolas.",
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
        Desde el <b>móvil</b>: toca «Compartir fotos», elige <b>Instagram</b> o <b>TikTok</b>, añade el audio en tendencia y pega la descripción (ya copiada). Las fotos puedes mejorarlas antes con ChatGPT.
      </p>

      {aviso && <p style={{ fontSize: 12, color: "#b45309", background: "#fffbeb", padding: 8, borderRadius: 6, marginTop: 8 }}>{aviso}</p>}
    </div>
  );
}
