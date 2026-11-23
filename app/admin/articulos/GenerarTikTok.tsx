"use client";

import { useRef, useState } from "react";
import { SITE_URL } from "../../../lib/site";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
const SEG = 3; // segundos por diapositiva

export type TikTokArticle = {
  slug: string;
  h1: string;
  intro: string;
  keyword: string | null;
  hero_image: string | null;
  sections: { h2: string; image?: string | null }[];
};

type Slide = { text: string; broll: string };
type Script = { slides: Slide[]; caption: string; hashtags: string[] };

// Carga una imagen remota como bitmap sin contaminar el canvas (fetch CORS).
async function cargarBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    return await createImageBitmap(await r.blob());
  } catch {
    return null;
  }
}

function wrap(x: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (x.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Overlay TRANSPARENTE 720x1280: velos + marca + gancho + CTA. Va encima del
// vídeo (o de la foto) de fondo, así que no dibuja fondo.
async function pintarOverlay(texto: string, idx: number, total: number): Promise<Uint8Array> {
  const W = 720, H = 1280;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;

  // Velos para legibilidad (arriba y abajo)
  const gt = x.createLinearGradient(0, 0, 0, 320);
  gt.addColorStop(0, "rgba(0,0,0,0.55)");
  gt.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gt;
  x.fillRect(0, 0, W, 320);
  const gb = x.createLinearGradient(0, 560, 0, H);
  gb.addColorStop(0, "rgba(0,0,0,0)");
  gb.addColorStop(1, "rgba(0,0,0,0.88)");
  x.fillStyle = gb;
  x.fillRect(0, 560, W, H - 560);

  // Marca arriba
  x.textBaseline = "top";
  x.font = "800 36px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.6)";
  x.shadowBlur = 8;
  x.fillText("InterRoom Murcia", 36, 44);

  // Gancho (tercio inferior)
  x.font = "800 66px Inter, Arial, sans-serif";
  const lines = wrap(x, texto, W - 80);
  const lh = 78;
  let y = 1010 - lines.length * lh;
  x.shadowBlur = 14;
  for (const ln of lines) {
    x.fillStyle = "#fff";
    x.fillText(ln, 40, y);
    y += lh;
  }
  x.shadowBlur = 0;

  // Píldora CTA
  const cta = idx === total - 1 ? `Léelo en ${SITE_HOST}` : SITE_HOST;
  x.font = "700 32px Inter, Arial, sans-serif";
  const tw = x.measureText(cta).width;
  const px = 40, py = 1120, pw = tw + 40, ph = 54, r = 27;
  x.fillStyle = "#ea6a12";
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + pw, py, px + pw, py + ph, r);
  x.arcTo(px + pw, py + ph, px, py + ph, r);
  x.arcTo(px, py + ph, px, py, r);
  x.arcTo(px, py, px + pw, py, r);
  x.closePath();
  x.fill();
  x.fillStyle = "#fff";
  x.fillText(cta, px + 20, py + 11);

  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("ov"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

// Fondo OPACO 720x1280 (fallback cuando no hay clip de vídeo): foto a cover o
// degradado de marca.
async function pintarFondo(bmp: ImageBitmap | null): Promise<Uint8Array> {
  const W = 720, H = 1280;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  if (bmp) {
    const s = Math.max(W / bmp.width, H / bmp.height);
    const dw = bmp.width * s, dh = bmp.height * s;
    x.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1f2937");
    g.addColorStop(1, "#ea6a12");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("bg"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

// Busca un clip de b-roll y descarga sus bytes (vía nuestro proxy, sin CORS).
async function traerClip(query: string): Promise<Uint8Array | null> {
  if (!query) return null;
  try {
    const res = await fetch("/api/admin/articulos/broll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    if (!url) return null;
    const bytes = await fetch(`/api/admin/articulos/broll?url=${encodeURIComponent(url)}`);
    if (!bytes.ok) return null;
    return new Uint8Array(await bytes.arrayBuffer());
  } catch {
    return null;
  }
}

export function GenerarTikTok({ article, onClose }: { article: TikTokArticle; onClose: () => void }) {
  const url = `${SITE_URL}/blog/${article.slug}`;
  const [script, setScript] = useState<Script | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [fase, setFase] = useState("");
  const [pct, setPct] = useState(0);
  const [resultUrl, setResultUrl] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState("");
  const ffmpegRef = useRef<unknown>(null);
  const progRef = useRef({ seg: 0, total: 1 });

  async function generarGuion() {
    setLoadingScript(true);
    setError("");
    try {
      const res = await fetch("/api/admin/articulos/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          h1: article.h1,
          intro: article.intro,
          keyword: article.keyword,
          h2s: article.sections.map((s) => s.h2),
          url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error generando guion");
      setScript(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando guion");
    } finally {
      setLoadingScript(false);
    }
  }

  async function generarVideo() {
    if (!script) return;
    setError("");
    setResultUrl("");
    setResultBlob(null);
    setGenerando(true);
    setPct(0);
    const slides = script.slides;
    progRef.current = { seg: 0, total: slides.length + 1 };
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      let ffmpeg = ffmpegRef.current as InstanceType<typeof FFmpeg> | null;
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress }) => {
          const { seg, total } = progRef.current;
          setPct(Math.min(99, Math.round(((seg + Math.min(1, progress)) / total) * 100)));
        });
        await ffmpeg.load({
          coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
      }

      // Pool de fotos del artículo para los fallbacks.
      const imgUrls = [article.hero_image, ...article.sections.map((s) => s.image)].filter(Boolean) as string[];
      const bitmaps = (await Promise.all(imgUrls.map(cargarBitmap))).filter(Boolean) as ImageBitmap[];

      // 1) Traer clips de b-roll en paralelo.
      setFase("Buscando vídeos de fondo…");
      const clips = await Promise.all(slides.map((s) => traerClip(s.broll)));

      // 2) Un segmento mp4 por diapositiva (clip de vídeo o foto de fallback).
      for (let i = 0; i < slides.length; i++) {
        progRef.current.seg = i;
        setFase(`Montando diapositiva ${i + 1} de ${slides.length}…`);
        const ov = await pintarOverlay(slides[i].text, i, slides.length);
        await ffmpeg.writeFile(`ov${i}.png`, ov);

        if (clips[i]) {
          await ffmpeg.writeFile(`clip${i}.mp4`, clips[i]!);
          await ffmpeg.exec([
            "-ss", "0", "-t", String(SEG), "-i", `clip${i}.mp4`,
            "-i", `ov${i}.png`,
            "-filter_complex",
            "[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setpts=PTS-STARTPTS,fps=30[v];[v][1:v]overlay=0:0[o]",
            "-map", "[o]", "-an", "-t", String(SEG),
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", `seg${i}.mp4`,
          ]);
        } else {
          const bmp = bitmaps.length ? bitmaps[i % bitmaps.length] : null;
          await ffmpeg.writeFile(`bg${i}.png`, await pintarFondo(bmp));
          await ffmpeg.exec([
            "-loop", "1", "-t", String(SEG), "-i", `bg${i}.png`,
            "-i", `ov${i}.png`,
            "-filter_complex",
            "[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30[v];[v][1:v]overlay=0:0[o]",
            "-map", "[o]", "-an", "-t", String(SEG),
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", `seg${i}.mp4`,
          ]);
        }
      }

      // 3) Concatenar todos los segmentos (mismos parámetros -> copy directo).
      progRef.current.seg = slides.length;
      setFase("Uniendo el vídeo…");
      const list = slides.map((_, i) => `file 'seg${i}.mp4'`).join("\n") + "\n";
      await ffmpeg.writeFile("list.txt", new TextEncoder().encode(list));
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "out.mp4"]);

      const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      const blob = new Blob([data as unknown as BlobPart], { type: "video/mp4" });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setPct(100);
    } catch (e) {
      console.error("[tiktok]", e);
      setError("No se pudo generar el vídeo. Prueba en el PC o con menos diapositivas.");
    } finally {
      setGenerando(false);
      setFase("");
    }
  }

  function descargar() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `tiktok-${article.slug}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  async function compartir() {
    if (!resultBlob) return;
    const file = new File([resultBlob], `tiktok-${article.slug}.mp4`, { type: "video/mp4" });
    const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file] } as ShareData); } catch { /* cancelado */ }
    } else descargar();
  }
  async function copiar(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(label);
      setTimeout(() => setCopiado(""), 1500);
    } catch { /* noop */ }
  }

  const captionCompleto = script ? `${script.caption}\n\n${script.hashtags.join(" ")}` : "";

  return (
    <div className="articulos-preview-modal" onClick={onClose}>
      <div className="articulos-preview-modal-inner" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="articulos-preview-close" onClick={onClose}>Cerrar ✕</button>
        <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>🎵 TikTok del artículo</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>{article.h1}</p>

          {!script ? (
            <button type="button" className="btn-primary" onClick={generarGuion} disabled={loadingScript}>
              {loadingScript ? "Generando guion…" : "1. Generar guion + copy"}
            </button>
          ) : (
            <>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Diapositivas (gancho · vídeo de fondo)</div>
                <ol style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14 }}>
                  {script.slides.map((s, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <strong>{s.text}</strong>
                      {s.broll && <span style={{ color: "#9ca3af", fontSize: 12 }}> · 🎬 {s.broll}</span>}
                    </li>
                  ))}
                </ol>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Copy + hashtags</div>
                <p style={{ margin: "0 0 6px", fontSize: 14, whiteSpace: "pre-wrap" }}>{script.caption}</p>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#2563eb" }}>{script.hashtags.join(" ")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn-ghost btn-mini" onClick={() => copiar("copy", captionCompleto)}>
                    {copiado === "copy" ? "Copiado ✓" : "Copiar copy + hashtags"}
                  </button>
                  <button type="button" className="btn-ghost btn-mini" onClick={() => copiar("url", url)}>
                    {copiado === "url" ? "Copiado ✓" : "Copiar enlace del blog"}
                  </button>
                  <button type="button" className="btn-ghost btn-mini" onClick={generarGuion} disabled={loadingScript}>
                    {loadingScript ? "…" : "↻ Regenerar"}
                  </button>
                </div>
              </div>

              {!resultUrl && (
                <button type="button" className="btn-primary" onClick={generarVideo} disabled={generando}>
                  {generando ? `${fase || "Generando…"} ${pct}%` : "2. Generar vídeo 9:16"}
                </button>
              )}
              {generando && (
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  La primera vez descarga el motor de vídeo (~30 MB) y procesa cada clip. Puede tardar 1-2 min; no cierres esta ventana.
                </p>
              )}
            </>
          )}

          {error && <p style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", padding: 10, borderRadius: 8, marginTop: 12 }}>{error}</p>}

          {resultUrl && (
            <div style={{ marginTop: 16 }}>
              <video src={resultUrl} controls playsInline style={{ width: "100%", maxWidth: 240, borderRadius: 10, display: "block", background: "#000" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button type="button" className="btn-primary" onClick={compartir}>📲 Compartir a TikTok</button>
                <button type="button" className="btn-ghost" onClick={descargar}>⬇️ Descargar</button>
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
                Sin audio a propósito: al subirlo a TikTok, añade el audio en tendencia y pega el copy. Pon el enlace del blog en tu bio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
