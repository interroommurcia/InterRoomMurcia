import type { Metadata } from "next";
import Link from "next/link";
import { getArticulosPublicados } from "../../lib/articulos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — Alquiler y vida de estudiante en Murcia",
  description:
    "Guías sobre alquiler de habitaciones, zonas universitarias y vida de estudiante en Murcia y Cartagena.",
};

type Aparicion = {
  medio: string;
  logo: string;
  tipo: "Prensa" | "TV";
  fecha: string;
  titulo: string;
  subtitulo: string;
  url: string;
};

const APARICIONES: Aparicion[] = [
  {
    medio: "La Verdad",
    logo: "/logos/laverdad.png",
    tipo: "Prensa",
    fecha: "Septiembre 2024",
    titulo: "Murcia, un 'oasis' para los estudiantes que buscan piso",
    subtitulo:
      "El incremento de alojamientos y los precios contenidos hacen que la capital escape a la asfixia de otras ciudades.",
    url: "https://www.laverdad.es/murcia/murcia-oasis-estudiantes-buscan-piso-20240908071650-nt.html",
  },
];

export default async function BlogPage() {
  const articulos = await getArticulosPublicados();

  return (
    <section className="section blog-list">
      <div className="wrap">
        <div className="section-head">
          <h2>Blog de InterRoom Murcia</h2>
          <p>Guías sobre alquiler, zonas y vida de estudiante en Murcia y Cartagena.</p>
        </div>

        {APARICIONES.length > 0 && (
          <div className="prensa-strip">
            <div className="prensa-head">
              <h3>Nos han visto en</h3>
              <span className="prensa-rule" />
            </div>
            <div className="prensa-grid">
              {APARICIONES.map((a) => (
                <a
                  key={a.url}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prensa-card"
                >
                  <div
                    className="prensa-card-badge"
                    style={{ backgroundImage: `url(${a.logo})` }}
                    aria-label={a.medio}
                  />

                  <div className="prensa-card-body">
                    <div className="prensa-card-meta">
                      <span>{a.medio} · {a.fecha}</span>
                      <span className="prensa-card-tag">{a.tipo}</span>
                    </div>
                    <h4>{a.titulo}</h4>
                    <p>{a.subtitulo}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

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
