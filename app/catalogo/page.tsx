import Link from "next/link";
import { zonas, getPisos } from "../../lib/pisos";
import Reveal, { RevealStagger } from "../../components/Reveal";

export const metadata = {
  title: "Catálogo de habitaciones",
  description:
    "Todas las habitaciones para estudiantes disponibles en Murcia y Cartagena. Alquileres y compraventas actualizados al minuto.",
};

export default async function CatalogoPage() {
  const pisos = await getPisos();
  const alquileres = pisos.filter((p) => p.categoria === "alquiler");
  const compraventas = pisos.filter((p) => p.categoria === "compraventa");

  return (
    <>
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
    </>
  );
}
