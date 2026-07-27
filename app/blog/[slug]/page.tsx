import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticuloPorSlug, getArticulosRelacionados } from "../../../lib/articulos";
import { linkifyParrafo, detectarZona, ctaZona } from "../../../lib/articuloEnhancer";
import { ViewTracker, CtaLink } from "../ViewTracker";
import { SectionVideo } from "../SectionVideo";
import Reveal from "../../../components/Reveal";
import { SITE_URL } from "../../../lib/site";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const art = await getArticuloPorSlug(params.slug);
  if (!art) return { title: "Artículo no encontrado" };

  return {
    title: art.metaTitle,
    description: art.metaDescription,
    alternates: { canonical: `${SITE_URL}/blog/${art.slug}` },
    openGraph: {
      title: art.metaTitle,
      description: art.metaDescription,
      type: "article",
      url: `${SITE_URL}/blog/${art.slug}`,
      publishedTime: art.createdAt,
      ...(art.heroImage ? { images: [{ url: art.heroImage, width: 1200, height: 675, alt: art.h1 }] } : {}),
    },
  };
}

export default async function ArticuloPage({ params }: { params: { slug: string } }) {
  const art = await getArticuloPorSlug(params.slug);
  if (!art) return notFound();

  const relacionados = await getArticulosRelacionados(art.slug, 3);

  const fecha = new Date(art.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const animated = art.template !== "clasico";
  const Block = ({ className, children }: { className?: string; children: React.ReactNode }) =>
    animated ? <Reveal className={className}>{children}</Reveal> : <div className={className}>{children}</div>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: art.h1,
        description: art.metaDescription,
        author: { "@type": "Organization", name: "InterRoom Murcia", url: SITE_URL },
        publisher: {
          "@type": "Organization",
          name: "InterRoom Murcia",
          logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
        },
        url: `${SITE_URL}/blog/${art.slug}`,
        datePublished: art.createdAt,
        dateModified: art.createdAt,
        mainEntityOfPage: `${SITE_URL}/blog/${art.slug}`,
        ...(art.heroImage ? { image: art.heroImage } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: art.h1, item: `${SITE_URL}/blog/${art.slug}` },
        ],
      },
      ...(art.faq.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: art.faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <section className={`section article article-${art.template}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewTracker slug={art.slug} />
      <div className="wrap article-wrap">
        <nav className="article-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Inicio</Link> · <Link href="/blog">Blog</Link> · <span>{art.h1}</span>
        </nav>

        <div className="article-meta">
          {art.keyword ?? "InterRoom Murcia"} &nbsp;·&nbsp; {fecha}
        </div>

        <h1>{art.h1}</h1>

        <p className="article-intro" dangerouslySetInnerHTML={{ __html: linkifyParrafo(art.intro) }} />

        {art.heroImage && (
          <Block className="article-hero">
            <img src={art.heroImage} alt={art.h1} loading="eager" />
            {art.heroImageCredit && (
              <p className="article-credit">
                Foto:{" "}
                <a href={art.heroImageCreditUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  {art.heroImageCredit}
                </a>{" "}
                · Unsplash
              </p>
            )}
          </Block>
        )}

        {art.sections.map((section, i) => {
          const zonaCta = detectarZona(`${section.h2} ${section.content}`);
          const cta = zonaCta ? ctaZona(zonaCta) : null;
          return (
            <Block className="article-section" key={i}>
              <h2>{section.h2}</h2>
              {section.image && <img className="article-section-img" src={section.image} alt={section.h2} loading="lazy" />}
              {section.video && <SectionVideo url={section.video} />}
              {section.highlight && <blockquote className="article-highlight">{section.highlight}</blockquote>}
              {section.content.split("\n\n").map((para, j) => (
                <p key={j} dangerouslySetInnerHTML={{ __html: linkifyParrafo(para) }} />
              ))}
              {cta && (
                <Link href={cta.href} className="article-section-cta">
                  {cta.label}
                </Link>
              )}
            </Block>
          );
        })}

        {art.cta && (
          <Block className="article-cta">
            <p>{art.cta}</p>
            <CtaLink slug={art.slug} href="/contacto" className="btn-primary">
              Contactar con InterRoom Murcia -&gt;
            </CtaLink>
          </Block>
        )}

        {art.faq.length > 0 && (
          <div className="article-faq">
            <h2>Preguntas frecuentes</h2>
            {art.faq.map((item, i) => (
              <div className="article-faq-item" key={i}>
                <h3>{item.question}</h3>
                <p dangerouslySetInnerHTML={{ __html: linkifyParrafo(item.answer) }} />
              </div>
            ))}
          </div>
        )}

        {relacionados.length > 0 && (
          <div className="article-related">
            <h2>Sigue leyendo</h2>
            <div className="blog-grid">
              {relacionados.map((r) => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="blog-card">
                  {r.heroImageThumb && (
                    <div className="blog-card-img" style={{ backgroundImage: `url(${r.heroImageThumb})` }} />
                  )}
                  <div className="blog-card-body">
                    <div className="blog-card-meta">{r.keyword ?? "InterRoom Murcia"}</div>
                    <h4>{r.h1}</h4>
                    <p>{r.metaDescription}</p>
                    <span className="blog-card-link">Leer artículo -&gt;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
