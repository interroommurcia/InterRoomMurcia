"use client";

import { useRef, useState } from "react";
import { FONT, Media, Propiedad, totalConGaraje } from "./shared";

// Genera un reel vertical 9:16 en el navegador con ffmpeg.wasm (gratis).
// Recorta un tramo, lo acelera, lo recorta a 720x1280 y le superpone una
// banda con precio/zona + "interroommurcia.com". El audio se silencia por
// defecto para que añadas el audio en tendencia al publicar.
//
// Nota: ffmpeg.wasm (single-thread) corre entero en el navegador. Va bien en
// PC; en móvil con vídeos largos/pesados puede ir lento o quedarse sin memoria.

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

// Dibuja la banda/overlay 720x1280 transparente con la marca y el CTA.
async function crearOverlay(precio: string, zona: string): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 1280;
  const x = c.getContext("2d");
  if (!x) throw new Error("canvas");

  // Marca arriba
  x.textBaseline = "top";
  x.font = "800 40px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.5)";
  x.shadowBlur = 8;
  x.fillText("InterRoom Murcia", 36, 44);
  x.shadowBlur = 0;

  // Degradado inferior para legibilidad (empieza alto para cubrir el bloque)
  const g = x.createLinearGradient(0, 760, 0, 1280);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  x.fillStyle = g;
  x.fillRect(0, 760, 720, 520);

  // Bloque en el tercio inferior, sin bajar a la zona que tapan IG/TikTok.
  let y = 930;
  if (precio) {
    x.font = "800 70px Inter, Arial, sans-serif";
    x.fillStyle = "#fff";
    x.fillText(precio, 36, y);
    y += 80;
  }
  // Zona
  if (zona) {
    x.font = "600 40px Inter, Arial, sans-serif";
    x.fillStyle = "#f1f1f1";
    x.fillText(zona, 36, y);
    y += 54;
  }
  // Píldora CTA
  const cta = "interroommurcia.com";
  x.font = "700 34px Inter, Arial, sans-serif";
  const tw = x.measureText(cta).width;
  x.fillStyle = "#ea6a12";
  const px = 36, py = y + 6, pw = tw + 40, ph = 54;
  const r = 27;
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + pw, py, px + pw, py + ph, r);
  x.arcTo(px + pw, py + ph, px, py + ph, r);
  x.arcTo(px, py + ph, px, py, r);
  x.arcTo(px, py, px + pw, py, r);
  x.closePath();
  x.fill();
  x.fillStyle = "#fff";
  x.fillText(cta, px + 20, py + 10);

  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("overlay"))), "image/png"));
}

export function GenerarReel({ p }: { p: Propiedad }) {
  const [abierto, setAbierto] = useState(false);
  const videos = p.media.filter((m) => m.tipo === "video");

  const [fuenteUrl, setFuenteUrl] = useState<string>(videos[0]?.url ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [inicio, setInicio] = useState(0);
  const [duracion, setDuracion] = useState(25);
  const [velocidad, setVelocidad] = useState(1.5);

  const [generando, setGenerando] = useState(false);
  const [pct, setPct] = useState(0);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const ffmpegRef = useRef<unknown>(null);

  const precio = totalConGaraje(p);
  const textoPrecio = precio ? `${precio.toLocaleString("es-ES")}€${p.tipo === "venta_activo" ? "" : "/mes"}` : "";
  const textoZona = (p.direccion ?? "").trim() || "Murcia";

  async function generar() {
    setError("");
    setResultUrl("");
    setResultBlob(null);
    if (!archivo && !fuenteUrl) { setError("Elige un vídeo o sube uno."); return; }
    setGenerando(true);
    setPct(0);
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      let ffmpeg = ffmpegRef.current as InstanceType<typeof FFmpeg> | null;
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress }) => setPct(Math.min(99, Math.round(progress * 100))));
        await ffmpeg.load({
          coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
      }

      const overlay = await crearOverlay(textoPrecio, textoZona);
      await ffmpeg.writeFile("in.mp4", await fetchFile(archivo ?? fuenteUrl));
      await ffmpeg.writeFile("ov.png", await fetchFile(overlay));

      const dur = Math.min(Math.max(5, duracion), 45);
      await ffmpeg.exec([
        "-ss", String(Math.max(0, inicio)),
        "-t", String(dur),
        "-i", "in.mp4",
        "-i", "ov.png",
        "-filter_complex",
        `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setpts=PTS/${velocidad}[v];[v][1:v]overlay=0:0[vo]`,
        "-map", "[vo]",
        "-an",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "out.mp4",
      ]);

      const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      const blob = new Blob([data as unknown as BlobPart], { type: "video/mp4" });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setPct(100);
    } catch (e) {
      console.error("[reel]", e);
      setError("No se pudo generar el reel. Si el vídeo es muy largo/pesado, prueba en el PC, con un tramo más corto o súbelo más ligero.");
    } finally {
      setGenerando(false);
    }
  }

  async function compartirReel() {
    if (!resultBlob) return;
    const file = new File([resultBlob], `reel-${(p.nombre || "propiedad").replace(/[^a-zA-Z0-9]/g, "-")}.mp4`, { type: "video/mp4" });
    const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file] } as ShareData); } catch { /* cancelado */ }
    } else {
      descargarReel();
    }
  }
  function descargarReel() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `reel-${(p.nombre || "propiedad").replace(/[^a-zA-Z0-9]/g, "-")}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (videos.length === 0 && !abierto) return null;

  if (!abierto) {
    return (
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}
        >
          🎬 Generar reel del vídeo (beta)
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Generar reel 9:16 (beta)</div>
        <button type="button" onClick={() => setAbierto(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
      </div>

      {videos.length > 0 && (
        <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 8 }}>
          Vídeo de la propiedad
          <select value={archivo ? "" : fuenteUrl} onChange={(e) => { setFuenteUrl(e.target.value); setArchivo(null); }} style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, background: "#fff" }}>
            {videos.map((v, i) => <option key={v.id} value={v.url}>Vídeo {i + 1}</option>)}
          </select>
        </label>
      )}

      <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 12 }}>
        …o sube uno recién grabado
        <input type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; setArchivo(f); }} style={{ display: "block", marginTop: 4, fontSize: 13 }} />
        {archivo && <span style={{ fontSize: 11, color: "#16a34a" }}>Usando: {archivo.name} ({Math.round(archivo.size / 1024 / 1024)} MB)</span>}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
          Empieza en (s)
          <input type="number" min={0} value={inicio} onChange={(e) => setInicio(Number(e.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
        </label>
        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
          Duración (s, máx 45)
          <input type="number" min={5} max={45} value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
        </label>
        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
          Velocidad
          <select value={velocidad} onChange={(e) => setVelocidad(Number(e.target.value))} style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, background: "#fff" }}>
            <option value={1}>Normal</option>
            <option value={1.5}>Rápido ×1.5</option>
            <option value={2}>Muy rápido ×2</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={generar}
        disabled={generando}
        style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: generando ? "wait" : "pointer", fontSize: 14, fontWeight: 600 }}
      >
        {generando ? `Generando… ${pct}%` : "🎬 Generar reel"}
      </button>
      {generando && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>La primera vez descarga el motor de vídeo (~30 MB). Puede tardar; no cierres esta ventana.</p>}

      {error && <p style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", padding: 8, borderRadius: 6, marginTop: 10 }}>{error}</p>}

      {resultUrl && (
        <div style={{ marginTop: 14 }}>
          <video src={resultUrl} controls playsInline style={{ width: "100%", maxWidth: 260, borderRadius: 10, display: "block", background: "#000" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={compartirReel} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📲 Compartir a Insta/TikTok</button>
            <button type="button" onClick={descargarReel} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>⬇️ Descargar</button>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>Sin audio a propósito: al subirlo, añade el audio en tendencia de Instagram/TikTok.</p>
        </div>
      )}
    </div>
  );
}
