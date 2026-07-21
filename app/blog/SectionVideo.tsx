import { embedUrl } from "../../lib/videoEmbed";

export function SectionVideo({ url }: { url: string }) {
  const embed = embedUrl(url);

  if (embed) {
    return (
      <div className="article-video">
        <iframe
          src={embed}
          title="Vídeo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="article-video">
      <video src={url} controls preload="metadata" />
    </div>
  );
}
