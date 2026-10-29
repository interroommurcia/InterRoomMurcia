"use client";

type Aparicion = {
  medio: string;
  logo: string;
  tipo: "Prensa" | "TV";
  fecha: string;
  titulo: string;
  subtitulo: string;
  url: string;
};

// Slug estable por medio para contabilizar los clics (p. ej. "La Verdad" → "la-verdad").
function medioSlug(medio: string): string {
  return medio.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function PrensaCard({ a }: { a: Aparicion }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="prensa-card"
      onClick={() =>
        fetch("/api/blog/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: medioSlug(a.medio), event: "prensa_click", url: typeof window !== "undefined" ? window.location.href : null }),
          keepalive: true,
        }).catch(() => {})
      }
    >
      <div className="prensa-card-badge" style={{ backgroundImage: `url(${a.logo})` }} aria-label={a.medio} />
      <div className="prensa-card-body">
        <div className="prensa-card-meta">
          <span>{a.medio} · {a.fecha}</span>
          <span className="prensa-card-tag">{a.tipo}</span>
        </div>
        <h4>{a.titulo}</h4>
        <p>{a.subtitulo}</p>
      </div>
    </a>
  );
}
