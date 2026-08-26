import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pisoPorSlug, pisosPorZona, zonaPorSlug } from "../../../../lib/pisos";
import { whatsappHref } from "../../../../lib/whatsapp";
import FichaMedia from "../../../../components/FichaMedia";

export async function generateMetadata({
  params,
}: {
  params: { zona: string; slug: string };
}): Promise<Metadata> {
  const zona = zonaPorSlug(params.zona);
  const piso = await pisoPorSlug(zona?.slug ?? params.zona, params.slug);
  if (!piso) return { title: "Habitación no encontrada" };
  const precioLabel = piso.categoria === "compraventa" ? `${piso.precioMes.toLocaleString("es-ES")}€` : `${piso.precioMes}€/mes`;
  return {
    title: `${piso.titulo} — ${precioLabel}`,
    description: piso.descripcion.slice(0, 155),
    ...(piso.imageUrl ? { openGraph: { images: [{ url: piso.imageUrl }] } } : {}),
  };
}

export default async function PisoPage({ params }: { params: { zona: string; slug: string } }) {
  const zona = zonaPorSlug(params.zona);
  const piso = await pisoPorSlug(zona?.slug ?? params.zona, params.slug);
  if (!piso) return notFound();

  const esCompraventa = piso.categoria === "compraventa";
  const zonaLabel = zona?.universidad ?? piso.barrio;
  const barrioLabel = zona?.barrio ?? piso.barrio;
  const otros = (await pisosPorZona(zona?.slug ?? params.zona)).filter((p) => p.id !== piso.id).slice(0, 3);
  const mensaje = esCompraventa
    ? `Hola, estoy interesado/a en el activo "${piso.titulo}" (${piso.barrio}) que he visto en la web. ¿Sigue disponible?`
    : `Hola, estoy interesado/a en la habitación "${piso.titulo}" (${piso.barrio}) que he visto en la web. ¿Sigue disponible?`;

  return (
    <>
      <section className="ficha">
        <div className="wrap">
          <Link href={zona ? `/habitaciones/${zona.slug}` : "/#catalogo-compraventa"} className="ficha-back">
            &lt;- {zona ? `Volver a ${zona.universidad}` : "Volver al catálogo"}
          </Link>

          <div className="ficha-grid">
            <div>
              <FichaMedia
                imageUrl={piso.imageUrl}
                gallery={piso.gallery}
                videoUrl={piso.videoUrl}
                titulo={piso.titulo}
                disponible={piso.disponible}
              />

              <h1>{piso.titulo}</h1>
              <div className="ficha-loc">
                {piso.barrio}{zona ? ` · ${zona.universidad}` : ""}
              </div>

              <div className="ficha-facts">
                <div>
                  <b>{esCompraventa ? `${piso.precioMes.toLocaleString("es-ES")}€` : `${piso.precioMes}€`}</b>
                  <span>{esCompraventa ? "+ IVA" : "al mes"}</span>
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
                {esCompraventa ? `${piso.precioMes.toLocaleString("es-ES")}€` : <>{piso.precioMes}€ <span>/mes</span></>}
              </div>
              <p>{esCompraventa ? "Escríbenos y te enviamos toda la información, vídeo y concertamos visita." : "Escríbenos y te confirmamos disponibilidad, enviamos vídeo y concertamos visita en minutos."}</p>
              <a href={whatsappHref(mensaje)} target="_blank" rel="noopener noreferrer" className="btn-primary btn-whatsapp">
                <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" fill="currentColor">
                  <path d="M19.11 17.28c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/>
                  <path d="M26.62 5.4A14.85 14.85 0 0 0 3.51 23.16L2 30l7-1.83a14.83 14.83 0 0 0 7.08 1.8h.01c8.19 0 14.85-6.66 14.85-14.85a14.76 14.76 0 0 0-4.32-9.72zM16.09 27.47h-.01a12.32 12.32 0 0 1-6.28-1.72l-.45-.27-4.16 1.09 1.11-4.05-.29-.47a12.34 12.34 0 1 1 22.87-6.54c0 6.8-5.53 12.33-12.32 12.33z"/>
                </svg>
                Preguntar por WhatsApp
              </a>
              <Link href={zona ? `/habitaciones/${zona.slug}` : "/#catalogo-compraventa"} className="btn-ghost">
                {zona ? `Ver más en ${zona.barrio}` : "Ver más activos"}
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {otros.length > 0 && (
        <section className="catalog">
          <div className="wrap">
            <div className="section-head">
              <h2>{zona ? `Otras habitaciones en ${zona.barrio}` : "Otros activos disponibles"}</h2>
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
                        {p.categoria === "compraventa" ? `${p.precioMes.toLocaleString("es-ES")}€` : <>{p.precioMes}€ <span>/mes</span></>}
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
