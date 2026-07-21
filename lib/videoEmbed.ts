const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

export type VideoKind = "youtube" | "vimeo" | "file";

export function detectVideoKind(url: string): VideoKind {
  if (YOUTUBE_RE.test(url)) return "youtube";
  if (VIMEO_RE.test(url)) return "vimeo";
  return "file";
}

/** Devuelve la URL de embed (iframe) para YouTube/Vimeo, o null si es un archivo de vídeo directo. */
export function embedUrl(url: string): string | null {
  const yt = url.match(YOUTUBE_RE);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(VIMEO_RE);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
