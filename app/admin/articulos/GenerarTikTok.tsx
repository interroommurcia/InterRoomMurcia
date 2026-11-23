"use client";

import { useRef, useState } from "react";
import { SITE_URL } from "../../../lib/site";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

export type TikTokArticle = {
  slug: string;
  h1: string;
  intro: string;
  keyword: string | null;
  hero_image: string | null;
  sections: { h2: string; image?: string | null }[];
};

type RawSlide = { text: string; broll: string };
type Script = { slides: RawSlide[]; caption: string; hashtags: string[] };
// idx: índice del clip elegido en `candidates`; -1 = usar foto del artículo.
type EditSlide = { text: string; broll: string; candidates: string[]; idx: number };

const proxy = (url: string) => `/api/admin/articulos/broll?url=${encodeURIComponent(url)}`;

async function cargarBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    return await createImageBitmap(await r.blob());
  } catch {
    return null;
  }
}

async function proxyBytes(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(proxy(url));
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

async function buscarCandidatos(query: string): Promise<string[]> {
  if (!query) return [];
  try {
    const res = await fetch("/api/admin/articulos/broll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: { url: string }[] = data.results ?? [];
    return results.map((r) => r.url).filter(Boolean);
  } catch {
    return [];
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

async function pintarOverlay(texto: string, idx: number, total: number, escala: number): Promise<Uint8Array> {
  const W = 720, H = 1280;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;

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

  x.textBaseline = "top";
  x.font = "800 36px Inter, Arial, sans-serif";
  x.fillStyle = "#fff";
  x.shadowColor = "rgba(0,0,0,0.6)";
  x.shadowBlur = 8;
  x.fillText("InterRoom Murcia", 36, 44);

  const fs = Math.round(66 * escala);
  x.font = `800 ${fs}px Inter, Arial, sans-serif`;
  const lines = wrap(x, texto, W - 80);
  const lh = Math.round(78 * escala);
  let y = 1010 - lines.length * lh;
  x.shadowBlur = 14;
  for (const ln of lines) {
    x.fillStyle = "#fff";
    x.fillText(ln, 40, y);
    y += lh;
  }
  x.shadowBlur = 0;

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

export function GenerarTikTok({ article, onClose }: { article: TikTokArticle; onClose: () => void }) {
  const url = `${SITE_URL}/blog/${article.slug}`;
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [slides, setSlides] = useState<EditSlide[] | null>(null);
  const [segDur, setSegDur] = useState(3); // segundos por diapositiva
  const [escala, setEscala] = useState(1); // tamaño de letra del gancho
  const [animar, setAnimar] = useState(true); // la letra aparece en cada cambio
  const [loadingScript, setLoadingScript] = useState(false);
  const [buscandoClips, setBuscandoClips] = useState(false);
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
      const data: Script = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Error generando guion");
      setCaption(data.caption ?? "");
      setHashtags(data.hashtags ?? []);
      const base: EditSlide[] = data.slides.map((s) => ({ text: s.text, broll: s.broll, candidates: [], idx: 0 }));
      setSlides(base);
      // Buscar clips candidatos de cada diapositiva.
      setBuscandoClips(true);
      const cands = await Promise.all(base.map((s) => buscarCandidatos(s.broll)));
      setSlides((prev) =>
        (prev ?? base).map((s, i) => ({ ...s, candidates: cands[i], idx: cands[i].length ? 0 : -1 }))
      );
      setBuscandoClips(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando guion");
    } finally {
      setLoadingScript(false);
    }
  }

  function setSlideText(i: number, text: string) {
    setSlides((prev) => (prev ? prev.map((s, j) => (j === i ? { ...s, text } : s)) : prev));
  }
  function otroClip(i: number) {
    setSlides((prev) =>
      prev
        ? prev.map((s, j) => {
            if (j !== i || s.candidates.length === 0) return s;
            const next = s.idx < 0 ? 0 : (s.idx + 1) % s.candidates.length;
            return { ...s, idx: next };
          })
        : prev
    );
  }
  function usarFoto(i: number) {
    setSlides((prev) => (prev ? prev.map((s, j) => (j === i ? { ...s, idx: -1 } : s)) : prev));
  }

  async function generarVideo() {
    if (!slides) return;
    setError("");
    setResultUrl("");
    setResultBlob(null);
    setGenerando(true);
    setPct(0);
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

      // Descargar el clip elegido de cada diapositiva (el que usa foto -> null).
      setFase("Descargando vídeos de fondo…");
      const clips = await Promise.all(
        slides.map((s) => (s.idx >= 0 && s.candidates[s.idx] ? proxyBytes(s.candidates[s.idx]) : Promise.resolve(null)))
      );
      const dur = String(segDur);
      // Animación del texto: funde el bloque (alpha) y lo sube ~40px en 0.4s.
      const ovChain = animar
        ? "[1:v]format=yuva420p,fade=t=in:st=0:d=0.4:alpha=1[ov];[v][ov]overlay=0:'if(lt(t,0.4),40-100*t,0)'[o]"
        : "[v][1:v]overlay=0:0[o]";

      for (let i = 0; i < slides.length; i++) {
        progRef.current.seg = i;
        setFase(`Montando diapositiva ${i + 1} de ${slides.length}…`);
        const ov = await pintarOverlay(slides[i].text, i, slides.length, escala);
        await ffmpeg.writeFile(`ov${i}.png`, ov);

        if (clips[i]) {
          await ffmpeg.writeFile(`clip${i}.mp4`, clips[i]!);
          await ffmpeg.exec([
            "-ss", "0", "-t", dur, "-i", `clip${i}.mp4`,
            "-loop", "1", "-i", `ov${i}.png`,
            "-filter_complex",
            `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setpts=PTS-STARTPTS,fps=30[v];${ovChain}`,
            "-map", "[o]", "-an", "-t", dur,
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", `seg${i}.mp4`,
          ]);
        } else {
          const bmp = bitmaps.length ? bitmaps[i % bitmaps.length] : null;
          await ffmpeg.writeFile(`bg${i}.png`, await pintarFondo(bmp));
          await ffmpeg.exec([
            "-loop", "1", "-t", dur, "-i", `bg${i}.png`,
            "-loop", "1", "-i", `ov${i}.png`,
            "-filter_complex",
            `[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30[v];${ovChain}`,
            "-map", "[o]", "-an", "-t", dur,
            "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", `seg${i}.mp4`,
          ]);
        }
      }

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

  const captionCompleto = `${caption}\n\n${hashtags.join(" ")}`;

  return (
    <div className="articulos-preview-modal" onClick={onClose}>
      <div className="articulos-preview-modal-inner" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="articulos-preview-close" onClick={onClose}>Cerrar ✕</button>
        <div style={{ padding: 20, fontFamily: "Inter, Arial, sans-serif" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>🎵 TikTok del artículo</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>{article.h1}</p>

          {!slides ? (
            <button type="button" className="btn-primary" onClick={generarGuion} disabled={loadingScript}>
              {loadingScript ? "Generando guion…" : "1. Generar guion + copy"}
            </button>
          ) : (
            <>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                  Diapositivas — edita la letra y elige el clip de fondo
                </div>
                {slides.map((s, i) => {
                  const clip = s.idx >= 0 ? s.candidates[s.idx] : null;
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid #eee" : "none" }}>
                      <div style={{ flex: "0 0 90px" }}>
                        {clip ? (
                          <video
                            key={clip}
                            src={proxy(clip)}
                            muted
                            loop
                            autoPlay
                            playsInline
                            style={{ width: 90, height: 160, objectFit: "cover", borderRadius: 8, background: "#000", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: 90, height: 160, borderRadius: 8, background: "linear-gradient(135deg,#1f2937,#ea6a12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, textAlign: "center", padding: 6 }}>
                            Foto del artículo
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>Diapositiva {i + 1}</span>
                        <textarea
                          value={s.text}
                          onChange={(e) => setSlideText(i, e.target.value)}
                          rows={2}
                          style={{ display: "block", width: "100%", marginTop: 4, padding: 6, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontWeight: 600, resize: "vertical" }}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {s.candidates.length > 0 ? (
                            <>
                              <button type="button" className="btn-ghost btn-mini" onClick={() => otroClip(i)}>
                                ↻ Otro clip{clip ? ` (${s.idx + 1}/${s.candidates.length})` : ""}
                              </button>
                              {clip ? (
                                <button type="button" className="btn-ghost btn-mini" onClick={() => usarFoto(i)}>🖼 Usar foto</button>
                              ) : (
                                <button type="button" className="btn-ghost btn-mini" onClick={() => otroClip(i)}>🎬 Usar vídeo</button>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>{buscandoClips ? "Buscando clips…" : "Sin clip · usará foto"}</span>
                          )}
                          {s.broll && <span style={{ fontSize: 11, color: "#cbd5e1" }}>🎬 {s.broll}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "12px 0 6px" }}>Copy + hashtags</div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  style={{ display: "block", width: "100%", padding: 6, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, resize: "vertical" }}
                />
                <p style={{ margin: "6px 0 10px", fontSize: 13, color: "#2563eb" }}>{hashtags.join(" ")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn-ghost btn-mini" onClick={() => copiar("copy", captionCompleto)}>
                    {copiado === "copy" ? "Copiado ✓" : "Copiar copy + hashtags"}
                  </button>
                  <button type="button" className="btn-ghost btn-mini" onClick={() => copiar("url", url)}>
                    {copiado === "url" ? "Copiado ✓" : "Copiar enlace del blog"}
                  </button>
                  <button type="button" className="btn-ghost btn-mini" onClick={generarGuion} disabled={loadingScript}>
                    {loadingScript ? "…" : "↻ Regenerar guion"}
                  </button>
                </div>
              </div>

              {!resultUrl && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                    Duración por diapositiva
                    <select value={segDur} onChange={(e) => setSegDur(Number(e.target.value))} disabled={generando} style={{ display: "block", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, background: "#fff" }}>
                      <option value={2}>2 s (ágil)</option>
                      <option value={3}>3 s</option>
                      <option value={4}>4 s</option>
                      <option value={5}>5 s (pausado)</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                    Tamaño de letra
                    <select value={escala} onChange={(e) => setEscala(Number(e.target.value))} disabled={generando} style={{ display: "block", marginTop: 4, padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, background: "#fff" }}>
                      <option value={0.85}>Pequeña</option>
                      <option value={1}>Mediana</option>
                      <option value={1.2}>Grande</option>
                      <option value={1.4}>Enorme</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={animar} onChange={(e) => setAnimar(e.target.checked)} disabled={generando} />
                    Animar la letra (aparece en cada cambio)
                  </label>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    Total ≈ {slides.length * segDur}s
                  </span>
                </div>
              )}
              {!resultUrl && (
                <button type="button" className="btn-primary" onClick={generarVideo} disabled={generando || buscandoClips}>
                  {generando ? `${fase || "Generando…"} ${pct}%` : buscandoClips ? "Buscando clips…" : "2. Generar vídeo 9:16"}
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
                <button type="button" className="btn-ghost" onClick={() => { setResultUrl(""); setResultBlob(null); }}>✎ Editar y rehacer</button>
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
