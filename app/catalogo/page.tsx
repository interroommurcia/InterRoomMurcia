import Link from "next/link";
import Image from "next/image";
import { zonas, getPisos, resumenZona } from "../../lib/pisos";
import Reveal, { RevealStagger } from "../../components/Reveal";
import PisoCard from "../../components/PisoCard";
import ProximamenteCard from "../../components/ProximamenteCard";

export const metadata = {
  title: "Catálogo de habitaciones",
  description:
    "Todas las habitaciones para estudiantes disponibles en Murcia y Cartagena. Alquileres y compraventas actualizados al minuto.",
};

export default async function CatalogoPage() {
  const pisos = await getPisos();
  const proximamente = pisos.filter((p) => p.estado === "proximamente");
  // Los "No disponible" no se muestran en el catálogo de cliente.
  const publicados = pisos.filter((p) => p.estado !== "proximamente" && p.estado !== "no_disponible");
  const alquileres = publicados.filter((p) => p.categoria === "alquiler");
  const compraventas = publicados.filter((p) => p.categoria === "compraventa");
  // Para el banner: TODAS las compraventas, en cualquier estado, con foto.
  const compraventasBanner = pisos
    .filter((p) => p.categoria === "compraventa" && p.imageUrl)
    .slice(0, 4);

  return (
    <>
      <section className="catalog-hero">
        <div className="wrap">
          <Reveal direction="up">
            <div className="catalog-hero-inner">
              <h1>Más de 500 habitaciones gestionadas que rotan cada curso</h1>
              <p className="hero-sub">
                Alquileres verificados cerca de la UCAM, UMU y UPCT. Reserva la tuya para el curso que viene.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="zonas">
        <div className="wrap">
          <Reveal direction="up">
            <div className="section-head">
              <h2>Busca por tu universidad</h2>
              <p>Cada zona tiene su propia pagina, con los pisos reales de ese barrio.</p>
            </div>
          </Reveal>
          <RevealStagger className="zone-row" stagger={100}>
            {zonas.map((zona) => {
              const { totalHabitaciones, desde } = resumenZona(pisos, zona.slug);
              return (
                <Link href={`/habitaciones/${zona.slug}`} className="zone-card" key={zona.slug}>
                  <div className="zone-pin">{zona.barrio}</div>
                  <h3>{zona.universidad}</h3>
                  <p>{zona.intro}</p>
                  <div className="zone-meta">
                    <span className="zone-count">{totalHabitaciones} habitaci{totalHabitaciones === 1 ? "ón" : "ones"}</span>
                    {desde > 0 && <span className="zone-price">desde {desde}€</span>}
                  </div>
                </Link>
              );
            })}
          </RevealStagger>
        </div>
      </section>

      <section className="cv-banner-wrap">
        <div className="wrap">
          <Reveal direction="up">
            <div className="cv-banner">
              <div className="cv-banner-main">
                <div className="cv-banner-text">
                  <span className="cv-banner-eyebrow">★ Compraventa de inmuebles</span>
                  <h2>¿Quieres comprar o invertir en Murcia?</h2>
                  <p>
                    Pisos, locales y oportunidades de inversión con la rentabilidad calculada.
                    Te acompañamos de la primera visita a la firma ante notario.
                  </p>
                </div>
                <div className="cv-banner-cta">
                  <Link href="#compraventa" className="cv-banner-btn">Ver compraventas →</Link>
                  <Link href="/inversores" className="cv-banner-link">Soy inversor</Link>
                </div>
              </div>
              {compraventasBanner.length > 0 && (
                <div className="cv-banner-thumbs">
                  {compraventasBanner.map((p) => (
                    <Link
                      href={`/habitaciones/${p.zona}/${p.slug}`}
                      className="cv-thumb"
                      key={p.id}
                    >
                      <div className="cv-thumb-img">
                        <Image src={p.imageUrl as string} alt={p.titulo} fill sizes="130px" style={{ objectFit: "cover" }} loading="lazy" />
                        {p.estado !== "disponible" && (
                          <span className="cv-thumb-estado">
                            {p.estado === "reservada" ? "Reservada" : p.estado === "vendida" ? "Vendida" : p.estado === "proximamente" ? "Próx." : "No disp."}
                          </span>
                        )}
                      </div>
                      <span className="cv-thumb-price">{p.precioMes.toLocaleString("es-ES")}€</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="catalog" id="alquileres">
        <div className="wrap">
          <Reveal direction="up">
            <div className="section-head">
              <h2>Alquileres</h2>
              <p>Habitaciones y pisos en alquiler, tradicional y por habitaciones.</p>
            </div>
          </Reveal>
          {alquileres.length > 0 ? (
            <RevealStagger className="card-grid" stagger={90}>
              {alquileres.map((piso) => (
                <PisoCard piso={piso} key={piso.id} />
              ))}
            </RevealStagger>
          ) : (
            <p className="admin-empty">No hay alquileres publicados todavía.</p>
          )}
        </div>
      </section>

      {proximamente.length > 0 && (
        <section className="catalog" id="proximamente">
          <div className="wrap">
            <Reveal direction="up">
              <div className="section-head">
                <h2>Próximamente</h2>
                <p>Propiedades que estamos captando. Déjanos tus datos y te avisamos cuando estén listas.</p>
              </div>
            </Reveal>
            <RevealStagger className="card-grid" stagger={90}>
              {proximamente.map((piso) => (
                <ProximamenteCard piso={piso} key={piso.id} />
              ))}
            </RevealStagger>
          </div>
        </section>
      )}

      <section className="section buscas-casa">
        <div className="wrap">
          <Reveal direction="scale">
            <h2 className="buscas-casa-title">¿Buscas casa?</h2>
          </Reveal>
        </div>
      </section>

      <section className="catalog" id="compraventa">
        <div className="wrap">
          <Reveal direction="up">
            <div className="section-head">
              <h2>Compraventas</h2>
              <p>Inmuebles en venta, operaciones de compraventa y créditos.</p>
            </div>
          </Reveal>
          {compraventas.length > 0 ? (
            <RevealStagger className="card-grid" stagger={90}>
              {compraventas.map((piso) => (
                <PisoCard piso={piso} key={piso.id} />
              ))}
            </RevealStagger>
          ) : (
            <p className="admin-empty">No hay compraventas publicadas todavía.</p>
          )}
        </div>
      </section>
    </>
  );
}
