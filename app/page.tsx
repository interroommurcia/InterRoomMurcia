import Link from "next/link";
import { zonas, getPisos } from "../lib/pisos";
import { WHATSAPP_NUMBER } from "../lib/whatsapp";
import Reveal, { RevealStagger } from "../components/Reveal";

export default async function HomePage() {
  const pisos = await getPisos();
  const disponibles = pisos.filter((p) => p.disponible).length;
  const alquileres = pisos.filter((p) => p.categoria === "alquiler");
  const compraventas = pisos.filter((p) => p.categoria === "compraventa");

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <Reveal direction="right" duration={1.3}>
            <div>
              <div className="eyebrow">Murcia - UCAM - UMU - UPCT</div>
              <h1>
                Tu habitacion
                <br />
                cerca del <em>campus</em>,
                <br />
                lista este curso.
              </h1>
              <p className="hero-sub">
                Habitaciones verificadas para estudiantes en Murcia y Cartagena.
                Disponibilidad real, actualizada al minuto, sin intermediarios raros.
              </p>
              <div className="hero-actions">
                <Link href="/catalogo" className="btn-primary">
                  Buscar habitacion
                </Link>
                <Link href="/catalogo" className="btn-ghost">
                  Catalogo
                </Link>
                <Link href="/contacto" className="btn-ghost">
                  Soy propietario
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal direction="left" delay={200} duration={1.4}>
            <div className="hero-side">
              <div>
                <div className="tag">
                  <span className="live-dot"></span> Disponibilidad en vivo
                </div>
                <div className="hero-side-title">Catalogo actualizado</div>
              </div>
              <div className="hero-stats">
                <div>
                  <b>{pisos.length}</b>
                  <span>habitaciones</span>
                </div>
                <div>
                  <b>{zonas.length}</b>
                  <span>zonas universitarias</span>
                </div>
                <div>
                  <b>{disponibles}</b>
                  <span>libres ahora</span>
                </div>
              </div>
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
              const enZona = pisos.filter((p) => p.zona === zona.slug);
              const desde = enZona.length > 0 ? Math.min(...enZona.map((p) => p.precioMes)) : 0;
              return (
                <Link href={`/habitaciones/${zona.slug}`} className="zone-card" key={zona.slug}>
                  <div className="zone-pin">{zona.barrio}</div>
                  <h3>{zona.universidad}</h3>
                  <p>{zona.intro}</p>
                  <div className="zone-meta">
                    <span className="zone-count">{enZona.length} habitaciones</span>
                    {desde > 0 && <span className="zone-price">desde {desde}€</span>}
                  </div>
                </Link>
              );
            })}
          </RevealStagger>
        </div>
      </section>

      <section className="catalog" id="catalogo">
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
                <Link href={`/habitaciones/${piso.zona}/${piso.slug}`} className="piso-card" key={piso.id}>
                  <div
                    className="piso-img"
                    style={piso.imageUrl ? { backgroundImage: `url(${piso.imageUrl})` } : undefined}
                  >
                    <span className={`piso-badge ${piso.disponible ? "" : "no-disponible"}`}>
                      {piso.disponible ? "Disponible" : "No disponible"}
                    </span>
                  </div>
                  <div className="piso-body">
                    <h4>{piso.titulo}</h4>
                    <div className="loc">{piso.barrio}</div>
                    <div className="piso-foot">
                      <div className="piso-price">
                        {piso.precioMes}€ <span>/mes</span>
                      </div>
                      <div className="piso-arrow">-&gt;</div>
                    </div>
                  </div>
                </Link>
              ))}
            </RevealStagger>
          ) : (
            <p className="admin-empty">No hay alquileres publicados todavía.</p>
          )}
        </div>
      </section>

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
                <Link href={`/habitaciones/${piso.zona}/${piso.slug}`} className="piso-card" key={piso.id}>
                  <div
                    className="piso-img"
                    style={piso.imageUrl ? { backgroundImage: `url(${piso.imageUrl})` } : undefined}
                  >
                    <span className={`piso-badge ${piso.disponible ? "" : "no-disponible"}`}>
                      {piso.disponible ? "Disponible" : "No disponible"}
                    </span>
                  </div>
                  <div className="piso-body">
                    <h4>{piso.titulo}</h4>
                    <div className="loc">{piso.barrio}</div>
                    <div className="piso-foot">
                      <div className="piso-price">
                        {piso.precioMes.toLocaleString("es-ES")}€
                      </div>
                      <div className="piso-arrow">-&gt;</div>
                    </div>
                  </div>
                </Link>
              ))}
            </RevealStagger>
          ) : (
            <p className="admin-empty">No hay compraventas publicadas todavía.</p>
          )}
        </div>
      </section>

      <section className="contacto-home">
        <Reveal direction="scale" className="wrap contacto-home-inner">
          <h2>Contacta con nosotros</h2>
          <p>Escríbenos por WhatsApp o llámanos directamente.</p>
          <div className="contacto-home-actions">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a href={`tel:+${WHATSAPP_NUMBER}`} className="btn-phone">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              +34 613 096 518
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
