// Retoque de foto 100% en el navegador (gratis, sin IA ni API).
// Aplica un "auto-mejora" sobrio tipo inmobiliaria:
//   1. Auto-niveles por canal (estira el histograma recortando colas) →
//      corrige fotos apagadas/oscuras y de paso equilibra dominantes de color.
//   2. Leve subida de luminosidad en medios (gamma) → más luminosa.
//   3. Saturación suave → colores vivos sin pasarse.
//   4. Enfoque suave (unsharp) → más nítida.
// No elimina objetos ni inventa nada (eso requeriría IA generativa).

const MAX_LADO = 2048; // redimensiona fotos enormes antes de procesar

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Supabase sirve ACAO:* → canvas no se "mancha"
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

/** Estira el histograma de un canal recortando un pequeño % de colas. */
function nivelesCanal(hist: number[], total: number, clip: number): [number, number] {
  const limite = total * clip;
  let acc = 0;
  let lo = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= limite) { lo = i; break; } }
  acc = 0;
  let hi = 255;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= limite) { hi = i; break; } }
  if (hi <= lo) { lo = 0; hi = 255; }
  return [lo, hi];
}

export async function retocarFoto(url: string): Promise<Blob> {
  const img = await cargarImagen(url);
  const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const n = w * h;

  // 1. Auto-niveles por canal (clip 0,4% en cada cola).
  const hr = new Array(256).fill(0);
  const hg = new Array(256).fill(0);
  const hb = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) { hr[d[i]]++; hg[d[i + 1]]++; hb[d[i + 2]]++; }
  const [rLo, rHi] = nivelesCanal(hr, n, 0.004);
  const [gLo, gHi] = nivelesCanal(hg, n, 0.004);
  const [bLo, bHi] = nivelesCanal(hb, n, 0.004);

  // LUTs: auto-niveles + gamma de luminosidad (gamma<1 aclara medios).
  const gamma = 0.92;
  const lut = (lo: number, hi: number) => {
    const t = new Uint8ClampedArray(256);
    const rango = Math.max(1, hi - lo);
    for (let v = 0; v < 256; v++) {
      let x = (v - lo) / rango;
      x = Math.min(1, Math.max(0, x));
      x = Math.pow(x, gamma);
      t[v] = Math.round(x * 255);
    }
    return t;
  };
  const lutR = lut(rLo, rHi);
  const lutG = lut(gLo, gHi);
  const lutB = lut(bLo, bHi);

  // 2 + 3. Aplica LUTs y saturación suave (x1.12 respecto a la luma).
  const sat = 1.12;
  for (let i = 0; i < d.length; i += 4) {
    let r = lutR[d[i]];
    let g = lutG[d[i + 1]];
    let b = lutB[d[i + 2]];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    r = luma + (r - luma) * sat;
    g = luma + (g - luma) * sat;
    b = luma + (b - luma) * sat;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }

  // 4. Enfoque suave (unsharp 3x3) sobre una copia de los niveles ya ajustados.
  const src = new Uint8ClampedArray(d);
  const amount = 0.35;
  const idx = (x: number, y: number, c: number) => (y * w + x) * 4 + c;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const centro = src[idx(x, y, c)];
        const vecinos = src[idx(x - 1, y, c)] + src[idx(x + 1, y, c)] + src[idx(x, y - 1, c)] + src[idx(x, y + 1, c)];
        const nitido = centro + amount * (4 * centro - vecinos) / 4;
        d[idx(x, y, c)] = nitido < 0 ? 0 : nitido > 255 ? 255 : nitido;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo exportar la foto"))), "image/jpeg", 0.92);
  });
}
