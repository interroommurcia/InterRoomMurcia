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

type Script = { slides: string[]; caption: string; hashtags: string[] };

// Carga una imagen remota como bitmap sin contaminar el canvas (fetch CORS).
async function cargarBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    const b = await r.blob();
    return await createImageBitmap(b);
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
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Dibuja una diapositiva 720x1280: foto (o degradado) + marca + gancho + CTA.
async function pintarSlide(texto: string, bmp: ImageBitmap | null, idx: number, total: number): Promise<Blob> {
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

  // Velos para legibilidad (arriba y abajo)
  const gt = x.createLinearGradient(0, 0, 0, 300);
  gt.addColorStop(0, "rgba(0,0,0,0.55)");
  gt.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gt;
  x.fillRect(0, 0, W, 300);
  const gb = x.createLinearGradient(0, 640, 0, H);
  gb.addColorStop(0, "rgba(0,0,0,0)");
  gb.addColorStop(1, "rgba(0,0,0,0.85)");
  x.fillStyle = gb;
  x.fillRect(0, 640, W, H - 640);

  // Marca arriba
  x.textBaseline = "top";
  x.font = "800 36px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.5)";
  x.shadowBlur = 8;
  x.fillText("InterRoom Murcia", 36, 44);
  x.shadowBlur = 0;

  // Gancho (centrado en el tercio inferior)
  x.textAlign = "left";
  x.font = "800 62px Inter, Arial, sans-serif";
  const lines = wrap(x, texto, W - 80);
  const lh = 74;
  let y = 1000 - lines.length * lh;
  x.shadowColor = "rgba(0,0,0,0.6)";
  x.shadowBlur = 12;
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

  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("slide"))), "image/png"));
}

export function GenerarTikTok({ article, onClose }: { article: TikTokArticle; onClose: () => void }) {
  const url = `${SITE_URL}/blog/${article.slug}`;
  const [script, setScript] = useState<Script | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [pct, setPct] = useState(0);
  const [resultUrl, setResultUrl] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState("");
  const ffmpegRef = useRef<unknown>(null);

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
    try {
      // Imágenes disponibles del artículo, en orden; se reparten entre slides.
      const imgUrls = [article.hero_image, ...article.sections.map((s) => s.image)].filter(Boolean) as string[];
      const bitmaps = await Promise.all(imgUrls.map(cargarBitmap));
      const usable = bitmaps.filter(Boolean) as ImageBitmap[];

      const slides = script.slides;
      const pngs: Uint8Array[] = [];
      for (let i = 0; i < slides.length; i++) {
        const bmp = usable.length ? usable[i % usable.length] : null;
        const blob = await pintarSlide(slides[i], bmp, i, slides.length);
        pngs.push(new Uint8Array(await blob.arrayBuffer()));
      }

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
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

      for (let i = 0; i < pngs.length; i++) await ffmpeg.writeFile(`s${i}.png`, pngs[i]);
      const list =
        pngs.map((_, i) => `file 's${i}.png'\nduration ${SEG}`).join("\n") + `\nfile 's${pngs.length - 1}.png'\n`;
      await ffmpeg.writeFile("list.txt", new TextEncoder().encode(list));

      await ffmpeg.exec([
        "-f", "concat", "-safe", "0", "-i", "list.txt",
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        "out.mp4",
      ]);

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
    } else {
      descargar();
    }
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
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Diapositivas (ganchos)</div>
                <ol style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14 }}>
                  {script.slides.map((s, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{s}</li>
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
                  {generando ? `Generando vídeo… ${pct}%` : "2. Generar vídeo 9:16"}
                </button>
              )}
              {generando && (
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  La primera vez descarga el motor de vídeo (~30 MB). No cierres esta ventana.
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
