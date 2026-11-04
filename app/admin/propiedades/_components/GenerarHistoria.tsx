"use client";

import { useState } from "react";
import { FONT } from "./shared";

// Genera una historia 9:16 (1080x1920) desde una foto, 100% en canvas (gratis,
// sin IA ni API). Superpone "Nueva vivienda", precio y lo que incluye + CTA.
// Pensada para subir como Historia de Instagram/TikTok y traer tráfico a la web.

type ItemMedia = { id: string; url: string };

const W = 1080;
const H = 1920;

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Supabase sirve ACAO:* → canvas no se "mancha"
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

// Dibuja texto partido en varias líneas y devuelve la y final.
function textoMultilinea(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, maxW: number, lh: number): number {
  const palabras = texto.split(" ");
  let linea = "";
  let yy = y;
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (ctx.measureText(prueba).width > maxW && linea) {
      ctx.fillText(linea, x, yy);
      linea = p;
      yy += lh;
    } else {
      linea = prueba;
    }
  }
  if (linea) {
    ctx.fillText(linea, x, yy);
    yy += lh;
  }
  return yy;
}

async function dibujarHistoria(fotoUrl: string, titulo: string, precio: string, incluye: string[]): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) throw new Error("canvas");

  // Fondo: foto a "cover".
  const img = await cargarImagen(fotoUrl);
  const escala = Math.max(W / img.width, H / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);

  // Oscurecidos para legibilidad (arriba y abajo).
  const gTop = x.createLinearGradient(0, 0, 0, 360);
  gTop.addColorStop(0, "rgba(0,0,0,0.55)");
  gTop.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gTop;
  x.fillRect(0, 0, W, 360);
  const gBot = x.createLinearGradient(0, 980, 0, H);
  gBot.addColorStop(0, "rgba(0,0,0,0)");
  gBot.addColorStop(1, "rgba(0,0,0,0.9)");
  x.fillStyle = gBot;
  x.fillRect(0, 980, W, H - 980);

  x.textBaseline = "top";

  // Marca arriba.
  x.font = "800 46px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.5)";
  x.shadowBlur = 10;
  x.fillText("InterRoom Murcia", 56, 60);
  x.shadowBlur = 0;

  // Badge "Nueva vivienda".
  const badge = "✨ NUEVA VIVIENDA";
  x.font = "800 38px Inter, Arial, sans-serif";
  const bw = x.measureText(badge).width + 56;
  x.fillStyle = "#ea6a12";
  x.beginPath();
  x.roundRect(56, 130, bw, 72, 36);
  x.fill();
  x.fillStyle = "#fff";
  x.fillText(badge, 84, 148);

  // Bloque inferior (sin bajar a la zona que tapan IG/TikTok).
  let y = 1180;

  // Título.
  x.font = "700 64px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.6)";
  x.shadowBlur = 8;
  y = textoMultilinea(x, titulo, 56, y, W - 112, 76) + 14;

  // Precio.
  if (precio) {
    x.font = "800 108px Inter, Arial, sans-serif";
    x.fillText(precio, 56, y);
    y += 128;
  }
  x.shadowBlur = 0;

  // Lo que incluye (bullets).
  if (incluye.length) {
    x.font = "600 40px Inter, Arial, sans-serif";
    x.fillStyle = "#f1f1f1";
    for (const item of incluye.slice(0, 6)) {
      x.fillText(`•  ${item}`, 56, y);
      y += 56;
    }
    y += 6;
  }

  // Píldora CTA.
  const cta = "👉 interroommurcia.com";
  x.font = "700 40px Inter, Arial, sans-serif";
  const cw = x.measureText(cta).width + 56;
  x.fillStyle = "#fff";
  x.beginPath();
  x.roundRect(56, y + 8, cw, 72, 36);
  x.fill();
  x.fillStyle = "#111";
  x.fillText(cta, 84, y + 26);

  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("historia"))), "image/jpeg", 0.9));
}

export function GenerarHistoria({ nombre, fotos, titulo, textoPrecio, incluye }: {
  nombre: string;
  fotos: ItemMedia[];
  titulo: string;
  textoPrecio: string;
  incluye: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [fondo, setFondo] = useState<string>(fotos[0]?.url ?? "");
  const [generando, setGenerando] = useState(false);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  async function generar() {
    if (!fondo) { setError("Elige una foto de fondo."); return; }
    setError("");
    setGenerando(true);
    try {
      const blob = await dibujarHistoria(fondo, titulo, textoPrecio, incluye);
      setResultBlob(blob);
      setResultUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
    } catch {
      setError("No se pudo generar la historia. Prueba con otra foto.");
    } finally {
      setGenerando(false);
    }
  }

  function nombreArchivo() {
    return `historia-${(nombre || "vivienda").replace(/[^a-zA-Z0-9]/g, "-")}.jpg`;
  }

  async function compartir() {
    if (!resultBlob) return;
    const file = new File([resultBlob], nombreArchivo(), { type: "image/jpeg" });
    const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file] } as ShareData); } catch (e) { if (e instanceof Error && e.name !== "AbortError") descargar(); }
    } else {
      descargar();
    }
  }
  function descargar() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = nombreArchivo();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (fotos.length === 0) return null;

  if (!abierto) {
    return (
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}
        >
          🖼️ Crear historia «Nueva vivienda»
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Historia 9:16 «Nueva vivienda»</div>
        <button type="button" onClick={() => setAbierto(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
      </div>

      <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Foto de fondo</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6, marginTop: 6, marginBottom: 12 }}>
        {fotos.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setFondo(m.url)}
            style={{ padding: 0, border: `2px solid ${fondo === m.url ? "var(--orange)" : "#e5e7eb"}`, borderRadius: 6, overflow: "hidden", cursor: "pointer", aspectRatio: "9 / 16", background: "#f3f4f6" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: fondo === m.url ? 1 : 0.55 }} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={generar}
        disabled={generando}
        style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: generando ? "wait" : "pointer", fontSize: 14, fontWeight: 600 }}
      >
        {generando ? "Generando…" : "🖼️ Generar historia"}
      </button>

      {error && <p style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", padding: 8, borderRadius: 6, marginTop: 10 }}>{error}</p>}

      {resultUrl && (
        <div style={{ marginTop: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="Historia" style={{ width: "100%", maxWidth: 240, borderRadius: 10, display: "block", border: "1px solid #e5e7eb" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={compartir} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📲 Compartir a historia</button>
            <button type="button" onClick={descargar} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>⬇️ Descargar</button>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>Súbela como Historia en Instagram/TikTok. Si quieres, añade un sticker de música o un enlace a la web.</p>
        </div>
      )}
    </div>
  );
}
