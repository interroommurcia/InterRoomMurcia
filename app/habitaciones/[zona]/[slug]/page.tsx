import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pisoPorSlug, pisosPorZona, zonaPorSlug } from "../../../../lib/pisos";
import { whatsappHref } from "../../../../lib/whatsapp";

export async function generateMetadata({
  params,
}: {
  params: { zona: string; slug: string };
}): Promise<Metadata> {
  const zona = zonaPorSlug(params.zona);
  if (!zona) return {};
  const piso = await pisoPorSlug(zona.slug, params.slug);
  if (!piso) return { title: "Habitación no encontrada" };
  return {
    title: `${piso.titulo} — ${piso.precioMes}€/mes`,
    description: piso.descripcion.slice(0, 155),
    ...(piso.imageUrl ? { openGraph: { images: [{ url: piso.imageUrl }] } } : {}),
  };
}

export default async function PisoPage({ params }: { params: { zona: string; slug: string } }) {
  const zona = zonaPorSlug(params.zona);
  if (!zona) return notFound();

  const piso = await pisoPorSlug(zona.slug, params.slug);
  if (!piso) return notFound();

  const otros = (await pisosPorZona(zona.slug)).filter((p) => p.id !== piso.id).slice(0, 3);
  const mensaje = `Hola, estoy interesado/a en la habitación "${piso.titulo}" (${piso.barrio}) que he visto en la web. ¿Sigue disponible?`;

  return (
    <>
      <section className="ficha">
        <div className="wrap">
          <Link href={`/habitaciones/${zona.slug}`} className="ficha-back">
            &lt;- Volver a {zona.universidad}
          </Link>

          <div className="ficha-grid">
            <div>
              <div
                className="ficha-hero"
                style={piso.imageUrl ? { backgroundImage: `url(${piso.imageUrl})` } : undefined}
              >
                <span className={`piso-badge ${piso.disponible ? "" : "no-disponible"}`}>
                  {piso.disponible ? "Disponible" : "No disponible"}
                </span>
              </div>

              <h1>{piso.titulo}</h1>
              <div className="ficha-loc">
                {piso.barrio} · {zona.universidad}
              </div>

              <div className="ficha-facts">
                <div>
                  <b>{piso.precioMes}€</b>
                  <span>al mes</span>
                </div>
                {piso.metros && (
                  <div>
                    <b>{piso.metros} m²</b>
                    <span>superficie</span>
                  </div>
                )}
                <div>
                  <b>{piso.disponible ? "Sí" : "No"}</b>
                  <span>disponible ahora</span>
                </div>
              </div>

              <div className="ficha-desc">
                <h2>Descripción</h2>
                <p>{piso.descripcion}</p>
              </div>
            </div>

            <aside className="ficha-cta-card">
              <div className="ficha-cta-price">
                {piso.precioMes}€ <span>/mes</span>
              </div>
              <p>Escríbenos y te confirmamos disponibilidad y visita en minutos.</p>
              <a href={whatsappHref(mensaje)} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Preguntar por WhatsApp
              </a>
              <Link href={`/habitaciones/${zona.slug}`} className="btn-ghost">
                Ver más en {zona.barrio}
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {otros.length > 0 && (
        <section className="catalog">
          <div className="wrap">
            <div className="section-head">
              <h2>Otras habitaciones en {zona.barrio}</h2>
            </div>
            <div className="card-grid">
              {otros.map((p) => (
                <Link href={`/habitaciones/${p.zona}/${p.slug}`} className="piso-card" key={p.id}>
                  <div
                    className="piso-img"
                    style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})` } : undefined}
                  >
                    <span className={`piso-badge ${p.disponible ? "" : "no-disponible"}`}>
                      {p.disponible ? "Disponible" : "No disponible"}
                    </span>
                  </div>
                  <div className="piso-body">
                    <h4>{p.titulo}</h4>
                    <div className="loc">{p.barrio}</div>
                    <div className="piso-foot">
                      <div className="piso-price">
                        {p.precioMes}€ <span>/mes</span>
                      </div>
                      <div className="piso-arrow">-&gt;</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
