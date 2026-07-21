import type { Metadata } from "next";
import Link from "next/link";
import { getArticulosPublicados } from "../../lib/articulos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — Alquiler y vida de estudiante en Murcia",
  description:
    "Guías sobre alquiler de habitaciones, zonas universitarias y vida de estudiante en Murcia y Cartagena.",
};

export default async function BlogPage() {
  const articulos = await getArticulosPublicados();

  return (
    <section className="section blog-list">
      <div className="wrap">
        <div className="section-head">
          <h2>Blog de InterRoom Murcia</h2>
          <p>Guías sobre alquiler, zonas y vida de estudiante en Murcia y Cartagena.</p>
        </div>

        {articulos.length === 0 ? (
          <div className="admin-empty">Próximamente — los primeros artículos están en camino.</div>
        ) : (
          <div className="blog-grid">
            {articulos.map((art) => (
              <Link key={art.id} href={`/blog/${art.slug}`} className="blog-card">
                {art.heroImageThumb && (
                  <div className="blog-card-img" style={{ backgroundImage: `url(${art.heroImageThumb})` }} />
                )}
                <div className="blog-card-body">
                  <div className="blog-card-meta">
                    {art.keyword ?? "InterRoom Murcia"} ·{" "}
                    {new Date(art.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <h4>{art.h1}</h4>
                  <p>{art.metaDescription}</p>
                  <span className="blog-card-link">Leer artículo -&gt;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
