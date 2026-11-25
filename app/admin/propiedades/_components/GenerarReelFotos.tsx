"use client";

import { useRef, useState } from "react";
import { FONT } from "./shared";

type ItemMedia = { id: string; url: string };

// Genera un reel vertical 9:16 a partir de FOTOS (no de vídeo), animándolas con
// movimiento Ken Burns (zoom/paneo suave) y transiciones entre ellas. 100% en el
// navegador con ffmpeg.wasm (gratis, sin IA ni API). Le superpone la banda con
// precio/zona + "interroommurcia.com". Sin audio: se añade el trending al subir.
//
// El filtrograma (zoompan + xfade + overlay) está validado offline con ffmpeg.

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
const W = 720;
const H = 1280;
const FPS = 30;
const UP = 2; // sobre-escalado para suavizar el zoom (2× = nítido y ligero)
const MAX_FOTOS = 8; // tope por memoria/tiempo en ffmpeg.wasm single-thread
const TRANS = ["fade", "slideleft", "wipeleft", "circleopen", "slideup"];

// Banda/overlay 720x1280 transparente con marca, precio/zona y CTA.
async function crearOverlay(precio: string, zona: string): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) throw new Error("canvas");

  x.textBaseline = "top";
  x.font = "800 40px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.5)";
  x.shadowBlur = 8;
  x.fillText("InterRoom Murcia", 36, 44);
  x.shadowBlur = 0;

  const g = x.createLinearGradient(0, 760, 0, 1280);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.82)");
  x.fillStyle = g;
  x.fillRect(0, 760, W, 520);

  let y = 930;
  if (precio) {
    x.font = "800 70px Inter, Arial, sans-serif";
    x.fillStyle = "#fff";
    x.fillText(precio, 36, y);
    y += 80;
  }
  if (zona) {
    x.font = "600 40px Inter, Arial, sans-serif";
    x.fillStyle = "#f1f1f1";
    x.fillText(zona, 36, y);
    y += 54;
  }
  const cta = "interroommurcia.com";
  x.font = "700 34px Inter, Arial, sans-serif";
  const tw = x.measureText(cta).width;
  x.fillStyle = "#ea6a12";
  const px = 36, py = y + 6, pw = tw + 40, ph = 54, r = 27;
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

// Construye los argumentos de ffmpeg (misma lógica validada offline).
function construirArgs(n: number, dur: number, xf: number): string[] {
  const total = Math.round(dur * FPS);
  const inputs: string[] = [];
  for (let k = 0; k < n; k++) inputs.push("-loop", "1", "-t", String(dur), "-i", `img${k}.jpg`);
  inputs.push("-i", "ov.png");
  const ovIdx = n;

  const parts: string[] = [];
  for (let k = 0; k < n; k++) {
    const zin = k % 2 === 0;
    const z = zin ? "min(zoom+0.0010,1.20)" : "if(eq(on,1),1.20,max(zoom-0.0010,1.0))";
    parts.push(
      `[${k}:v]trim=end_frame=1,setpts=PTS-STARTPTS,` +
      `scale=${W * UP}:${H * UP}:force_original_aspect_ratio=increase,crop=${W * UP}:${H * UP},` +
      `zoompan=z='${z}':d=${total}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},` +
      `setsar=1,format=yuv420p[v${k}]`,
    );
  }
  let last = "[v0]";
  let acc = dur;
  for (let k = 1; k < n; k++) {
    const off = (acc - xf).toFixed(3);
    const t = TRANS[(k - 1) % TRANS.length];
    parts.push(`${last}[v${k}]xfade=transition=${t}:duration=${xf}:offset=${off}[x${k}]`);
    last = `[x${k}]`;
    acc += dur - xf;
  }
  if (n === 1) parts.push(`[v0]null[xlast]`);
  const base = n === 1 ? "[xlast]" : last;
  parts.push(`${base}[${ovIdx}:v]overlay=0:0:format=auto,format=yuv420p[vout]`);

  return [
    ...inputs,
    "-filter_complex", parts.join(";"),
    "-map", "[vout]",
    "-an",
    "-r", String(FPS),
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-pix_fmt", "yuv420p",
    "out.mp4",
  ];
}

export function GenerarReelFotos({ nombre, fotos, textoPrecio, textoZona }: {
  nombre: string;
  fotos: ItemMedia[]; // ya son las seleccionadas por el usuario
  textoPrecio: string;
  textoZona: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [dur, setDur] = useState(3);
  const [generando, setGenerando] = useState(false);
  const [pct, setPct] = useState(0);
  const [resultUrl, setResultUrl] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const ffmpegRef = useRef<unknown>(null);

  const usables = fotos.slice(0, MAX_FOTOS);

  async function generar() {
    setError("");
    setResultUrl("");
    setResultBlob(null);
    if (usables.length === 0) { setError("Marca arriba con ✓ al menos una foto."); return; }
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

      // Escribe fotos + overlay en el FS virtual.
      for (let k = 0; k < usables.length; k++) {
        await ffmpeg.writeFile(`img${k}.jpg`, await fetchFile(usables[k].url));
      }
      const overlay = await crearOverlay(textoPrecio, textoZona);
      await ffmpeg.writeFile("ov.png", await fetchFile(overlay));

      await ffmpeg.exec(construirArgs(usables.length, Math.min(Math.max(2, dur), 5), 0.5));

      const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      const blob = new Blob([data as unknown as BlobPart], { type: "video/mp4" });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setPct(100);
    } catch (e) {
      console.error("[reel-fotos]", e);
      setError("No se pudo generar el reel. Prueba con menos fotos (4-6), o hazlo desde el PC si el móvil se queda sin memoria.");
    } finally {
      setGenerando(false);
    }
  }

  function nombreArchivo() {
    return `reel-${(nombre || "propiedad").replace(/[^a-zA-Z0-9]/g, "-")}.mp4`;
  }
  async function compartir() {
    if (!resultBlob) return;
    const file = new File([resultBlob], nombreArchivo(), { type: "video/mp4" });
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

  if (!abierto) {
    return (
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}
        >
          ✨ Crear reel animado desde fotos
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Reel animado 9:16 desde fotos</div>
        <button type="button" onClick={() => setAbierto(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>×</button>
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px", lineHeight: 1.5 }}>
        Usa las <b>fotos que tengas marcadas con ✓ arriba</b> (máx. {MAX_FOTOS}). Las anima con zoom y transiciones, en orden. {fotos.length > MAX_FOTOS && <span style={{ color: "#b45309" }}>Tienes {fotos.length} marcadas; se usarán las primeras {MAX_FOTOS}.</span>}
      </p>

      <div style={{ fontSize: 12, color: "#374151", marginBottom: 12 }}>
        Fotos a usar: <b>{usables.length}</b>{usables.length > 0 && <> · duración aprox. <b>{(usables.length * Math.min(Math.max(2, dur), 5) - (usables.length - 1) * 0.5).toFixed(0)}s</b></>}
      </div>

      <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 14 }}>
        Segundos por foto: {dur}s
        <input type="range" min={2} max={5} step={1} value={dur} onChange={(e) => setDur(Number(e.target.value))} style={{ display: "block", width: "100%", marginTop: 6 }} />
      </label>

      <button
        type="button"
        onClick={generar}
        disabled={generando || usables.length === 0}
        style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: generando ? "wait" : "pointer", opacity: usables.length === 0 ? 0.5 : 1, fontSize: 14, fontWeight: 600 }}
      >
        {generando ? `Generando… ${pct}%` : "✨ Generar reel"}
      </button>
      {generando && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>La primera vez descarga el motor de vídeo (~30 MB). Con varias fotos puede tardar un minuto; no cierres esta ventana.</p>}

      {error && <p style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", padding: 8, borderRadius: 6, marginTop: 10 }}>{error}</p>}

      {resultUrl && (
        <div style={{ marginTop: 14 }}>
          <video src={resultUrl} controls playsInline style={{ width: "100%", maxWidth: 260, borderRadius: 10, display: "block", background: "#000" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={compartir} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📲 Compartir a Insta/TikTok</button>
            <button type="button" onClick={descargar} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>⬇️ Descargar</button>
          </div>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>Sin audio a propósito: al subirlo, añade el audio en tendencia de Instagram/TikTok.</p>
        </div>
      )}
    </div>
  );
}
