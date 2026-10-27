import sharp from "sharp";

// Retoque "auto-mejora" en el servidor (misma idea que lib/retoqueFoto.ts del
// navegador, pero con sharp para poder aplicarlo al publicar en el catálogo):
//   - auto-orienta según EXIF (fotos de móvil tumbadas)
//   - auto-niveles (estira el histograma) → corrige fotos apagadas/oscuras
//   - sube un pelín brillo y saturación → más luminosa y con color vivo
//   - enfoque suave → más nítida
// No inventa detalle (eso sería IA). Si algo falla, devuelve el original intacto.

const MAX_LADO = 2048;

export async function retocarBufferServer(input: Buffer): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  try {
    const buffer = await sharp(input, { failOn: "none" })
      .rotate() // aplica la orientación EXIF y la "quema" en los píxeles
      .resize(MAX_LADO, MAX_LADO, { fit: "inside", withoutEnlargement: true })
      .normalize() // auto-niveles
      .modulate({ brightness: 1.04, saturation: 1.12 })
      .sharpen({ sigma: 1 })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: "image/jpeg", ext: "jpg" };
  } catch {
    // Si sharp no puede procesarla (formato raro, etc.), no bloqueamos la publicación.
    return { buffer: input, contentType: "image/jpeg", ext: "jpg" };
  }
}
