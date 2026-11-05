// Retoque "Interroom Editorial" 100% en el navegador (gratis, sin IA ni API).
// Reproduce el GRADO DE COLOR/LUZ del protocolo editorial (revista de interiorismo):
//   - Balance de blancos neutro (quita dominantes amarillas/azules).
//   - Exposición + recuperación de luces (ventanas) y apertura de sombras.
//   - Curva S suave con punto negro ligeramente levantado.
//   - Vibrance (sube colores apagados) con ligera desaturación global.
//   - HSL por tonos: suelos menos anaranjados, paredes menos amarillas,
//     madera natural, verdes/azules controlados.
//   - Claridad + nitidez con máscara (unsharp).
// NO hace: quitar cables/objetos, limpiar desorden ni corregir verticales.
// Eso requiere IA generativa; aquí solo se ajusta color, luz y nitidez.

const MAX_LADO = 2048;

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

// Curva tonal sobre x∈[0,1]: exposición + sombras/luces/blancos/negros + S suave.
// Valores adaptados del preset Lightroom al espacio sRGB del canvas (dampeados).
function construirToneLUT(): Float32Array {
  const lut = new Float32Array(256);
  const expMul = 1.07; // +0,35 EV aprox en sRGB
  const shadows = 0.1; // +35
  const highlights = 0.12; // -45
  const whites = 0.05; // +18
  const blacks = 0.045; // -14
  const contrast = 0.06; // +8
  const blackLift = 0.012; // curva: sube punto negro

  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  for (let v = 0; v < 256; v++) {
    let x = v / 255;
    x *= expMul;
    // Sombras (abre medios-bajos) y luces (recupera ventanas).
    x += shadows * (1 - smooth(0, 0.5, x));
    x -= highlights * smooth(0.5, 1, x);
    // Blancos (empuja el extremo alto) y negros (profundiza el extremo bajo).
    x += whites * smooth(0.65, 1, x);
    x -= blacks * (1 - smooth(0, 0.22, x));
    // Contraste / curva S alrededor de 0,5.
    x += contrast * Math.sin((x - 0.5) * Math.PI);
    // Punto negro ligeramente levantado (acabado editorial sutil).
    x = blackLift + x * (1 - blackLift);
    lut[v] = Math.min(1, Math.max(0, x)) * 255;
  }
  return lut;
}

// --- HSL ---
function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const dif = max - min;
  if (dif !== 0) {
    s = l > 0.5 ? dif / (2 - max - min) : dif / (max + min);
    if (max === r) h = ((g - b) / dif + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / dif + 2;
    else h = (r - g) / dif + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

// Ajustes HSL por banda de tono (satMul, lumAdd). Escala dampeada (~0,6).
const HSL_BANDS: { c: number; satMul: number; lumAdd: number }[] = (() => {
  const E = 0.6;
  const tabla: [number, number, number][] = [
    [0, -5, 5], [30, -8, 10], [60, -20, 15], [120, -20, 10],
    [180, -15, 5], [240, -15, 12], [280, -10, 0], [320, -10, 0],
  ];
  return tabla.map(([c, s, l]) => ({ c, satMul: 1 + (s / 100) * E, lumAdd: (l / 100) * E }));
})();

function bandaDe(h: number) {
  let best = HSL_BANDS[0], bd = 999;
  for (const b of HSL_BANDS) {
    const d = Math.min(Math.abs(h - b.c), 360 - Math.abs(h - b.c));
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

export async function retocarEditorial(url: string): Promise<Blob> {
  const img = await cargarImagen(url);
  const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // 1. Balance de blancos: neutraliza dominantes mirando los casi-blancos.
  let sr = 0, sg = 0, sb = 0, cnt = 0;
  for (let i = 0; i < d.length; i += 4) {
    const luma = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    if (luma > 0.75 && luma < 0.98) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; cnt++; }
  }
  let gR = 1, gB = 1;
  if (cnt > 50) {
    const aR = sr / cnt, aG = sg / cnt, aB = sb / cnt;
    const gray = (aR + aG + aB) / 3;
    gR = Math.min(1.1, Math.max(0.9, 1 + ((gray / aR) - 1) * 0.4));
    gB = Math.min(1.1, Math.max(0.9, 1 + ((gray / aB) - 1) * 0.4));
  }
  gR *= 1.01; gB *= 0.99; // ligera calidez (temperatura +3)

  const lut = construirToneLUT();
  const vib = 0.12;      // intensidad +12
  const satGlobal = 0.96; // saturación -4

  for (let i = 0; i < d.length; i += 4) {
    // Balance + curva tonal por canal.
    let r = lut[Math.min(255, Math.round(d[i] * gR))];
    let g = lut[d[i + 1]];
    let b = lut[Math.min(255, Math.round(d[i + 2] * gB))];

    // Vibrance (sube los colores apagados) + ligera desaturación global.
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const curSat = mx === 0 ? 0 : (mx - mn) / mx;
    const factor = (1 + vib * (1 - curSat)) * satGlobal;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    r = luma + (r - luma) * factor;
    g = luma + (g - luma) * factor;
    b = luma + (b - luma) * factor;

    // HSL por tono (suelos/paredes/madera/verdes/azules).
    const [hh, ss, ll] = rgb2hsl(r, g, b);
    if (ss > 0.04) {
      const band = bandaDe(hh);
      const ns = Math.min(1, Math.max(0, ss * band.satMul));
      const nl = Math.min(1, Math.max(0, ll + band.lumAdd * ss));
      [r, g, b] = hsl2rgb(hh, ns, nl);
    }

    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }

  // 2. Claridad + nitidez: unsharp con una copia desenfocada (box 3x3 separable).
  const base = new Uint8ClampedArray(d);
  const tmp = new Float32Array(d.length);
  const idx = (x: number, y: number, c: number) => (y * w + x) * 4 + c;
  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        const x0 = x > 0 ? x - 1 : 0, x1 = x < w - 1 ? x + 1 : w - 1;
        tmp[idx(x, y, c)] = (base[idx(x0, y, c)] + base[idx(x, y, c)] + base[idx(x1, y, c)]) / 3;
      }
    }
  }
  const blur = new Float32Array(d.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        const y0 = y > 0 ? y - 1 : 0, y1 = y < h - 1 ? y + 1 : h - 1;
        blur[idx(x, y, c)] = (tmp[idx(x, y0, c)] + tmp[idx(x, y, c)] + tmp[idx(x, y1, c)]) / 3;
      }
    }
  }
  const amount = 0.55;
  const umbral = 3; // máscara: no reforzar ruido en zonas planas
  for (let p = 0; p < d.length; p += 4) {
    for (let c = 0; c < 3; c++) {
      const detalle = base[p + c] - blur[p + c];
      if (Math.abs(detalle) < umbral) continue;
      const v = base[p + c] + amount * detalle;
      d[p + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo exportar la foto"))), "image/jpeg", 0.95);
  });
}
