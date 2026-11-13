"use client";

import { useState } from "react";
import { linkifyParrafo, detectarZona, ctaZona, ctaIntencion } from "../../../lib/articuloEnhancer";

export type PreviewSection = {
  h2: string;
  content: string;
  highlight: string | null;
  image?: string;
  video?: string;
};

export type PreviewData = {
  h1: string;
  intro: string;
  keyword?: string | null;
  heroImage?: string | null;
  sections: PreviewSection[];
  cta: string;
  faq: { question: string; answer: string }[];
  fuentes: { label: string; url: string }[];
};

type TemplateKey = "clasico" | "minimalista" | "revista";

const TEMPLATES: { key: TemplateKey; label: string }[] = [
  { key: "clasico", label: "Clásico" },
  { key: "minimalista", label: "Minimalista" },
  { key: "revista", label: "Revista" },
];

// Vista previa fiel de cómo se verá el artículo publicado. Replica el markup y
// las clases de app/blog/[slug]/page.tsx para reutilizar sus estilos globales
// (incl. enlaces internos automáticos y CTAs por zona/intención). Sin animación
// de scroll-reveal para que el contenido se vea siempre en el panel.
export function ArticlePreview({
  data,
  template,
  onTemplateChange,
}: {
  data: PreviewData;
  template: TemplateKey;
  onTemplateChange?: (t: TemplateKey) => void;
}) {
  const [internal, setInternal] = useState<TemplateKey>(template);
  const active = onTemplateChange ? template : internal;
  const setActive = (t: TemplateKey) => (onTemplateChange ? onTemplateChange(t) : setInternal(t));

  const ctaFinal = ctaIntencion(`${data.keyword ?? ""} ${data.h1} ${data.intro}`);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="article-preview">
      <div className="article-preview-bar">
        <span className="article-preview-label">Vista previa</span>
        <div className="article-preview-tabs">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={active === t.key ? "is-active" : ""}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="article-preview-frame">
        <section className={`section article article-${active}`}>
          <div className="wrap article-wrap">
            <nav className="article-breadcrumb" aria-label="Breadcrumb">
              Inicio · Blog · <span>{data.h1 || "Artículo"}</span>
            </nav>

            <div className="article-meta">
              {data.keyword || "InterRoom Murcia"} &nbsp;·&nbsp; {fecha}
            </div>

            <h1>{data.h1 || "Sin título"}</h1>

            {data.intro && (
              <p className="article-intro" dangerouslySetInnerHTML={{ __html: linkifyParrafo(data.intro) }} />
            )}

            {data.heroImage && (
              <div className="article-hero">
                <img src={data.heroImage} alt={data.h1} />
              </div>
            )}

            {data.sections.map((section, i) => {
              const zona = detectarZona(`${section.h2} ${section.content}`);
              const cta = zona ? ctaZona(zona) : null;
              return (
                <div className="article-section" key={i}>
                  <h2>{section.h2}</h2>
                  {section.image && <img className="article-section-img" src={section.image} alt={section.h2} />}
                  {section.video && <div className="article-preview-video">▶ Vídeo incrustado</div>}
                  {section.highlight && <blockquote className="article-highlight">{section.highlight}</blockquote>}
                  {section.content.split("\n\n").map((para, j) => (
                    <p key={j} dangerouslySetInnerHTML={{ __html: linkifyParrafo(para) }} />
                  ))}
                  {cta && (
                    <a href={cta.href} className="article-section-cta" onClick={(e) => e.preventDefault()}>
                      {cta.label}
                    </a>
                  )}
                </div>
              );
            })}

            {data.cta && (
              <div className="article-cta">
                <p>{data.cta}</p>
                <a href={ctaFinal.href} className="btn-primary" onClick={(e) => e.preventDefault()}>
                  {ctaFinal.label}
                </a>
              </div>
            )}

            {data.faq.length > 0 && (
              <div className="article-faq">
                <h2>Preguntas frecuentes</h2>
                {data.faq.map((item, i) => (
                  <div className="article-faq-item" key={i}>
                    <h3>{item.question}</h3>
                    <p dangerouslySetInnerHTML={{ __html: linkifyParrafo(item.answer) }} />
                  </div>
                ))}
              </div>
            )}

            {data.fuentes.length > 0 && (
              <div className="article-fuentes">
                <h2>Fuentes oficiales</h2>
                <ul>
                  {data.fuentes.map((f, i) => (
                    <li key={i}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        {f.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
