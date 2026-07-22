import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticuloPorSlug } from "../../../lib/articulos";
import { ViewTracker, CtaLink } from "../ViewTracker";
import { SectionVideo } from "../SectionVideo";
import Reveal from "../../../components/Reveal";
import { SITE_URL } from "../../../lib/site";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const art = await getArticuloPorSlug(params.slug);
  if (!art) return { title: "Artículo no encontrado" };

  const schemaOrg = {
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
          logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
        },
        url: `${SITE_URL}/blog/${art.slug}`,
        datePublished: art.createdAt,
        ...(art.heroImage ? { image: art.heroImage } : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: art.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

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
    other: { "script:ld+json": JSON.stringify(schemaOrg) },
  };
}

export default async function ArticuloPage({ params }: { params: { slug: string } }) {
  const art = await getArticuloPorSlug(params.slug);
  if (!art) return notFound();

  const fecha = new Date(art.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const animated = art.template !== "clasico";
  const Block = ({ className, children }: { className?: string; children: React.ReactNode }) =>
    animated ? <Reveal className={className}>{children}</Reveal> : <div className={className}>{children}</div>;

  return (
    <section className={`section article article-${art.template}`}>
      <ViewTracker slug={art.slug} />
      <div className="wrap article-wrap">
        <div className="article-meta">
          {art.keyword ?? "InterRoom Murcia"} &nbsp;·&nbsp; {fecha}
        </div>

        <h1>{art.h1}</h1>

        <p className="article-intro">{art.intro}</p>

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

        {art.sections.map((section, i) => (
          <Block className="article-section" key={i}>
            <h2>{section.h2}</h2>
            {section.image && <img className="article-section-img" src={section.image} alt={section.h2} loading="lazy" />}
            {section.video && <SectionVideo url={section.video} />}
            {section.highlight && <blockquote className="article-highlight">{section.highlight}</blockquote>}
            {section.content.split("\n\n").map((para, j) => (
              <p key={j}>{para}</p>
            ))}
          </Block>
        ))}

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
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
