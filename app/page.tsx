import Link from "next/link";
import { zonas, pisos } from "../lib/pisos";

export default function HomePage() {
  const disponibles = pisos.filter((p) => p.disponible).length;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
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
              <Link href="#catalogo" className="btn-primary">
                Buscar habitacion
              </Link>
              <Link href="/contacto" className="btn-ghost">
                Soy propietario
              </Link>
            </div>
          </div>
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
        </div>
      </section>

      <section className="section" id="zonas">
        <div className="wrap">
          <div className="section-head">
            <h2>Busca por tu universidad</h2>
            <p>Cada zona tiene su propia pagina, con los pisos reales de ese barrio.</p>
          </div>
          <div className="zone-row">
            {zonas.map((zona) => {
              const enZona = pisos.filter((p) => p.zona === zona.slug);
              const desde = Math.min(...enZona.map((p) => p.precioMes));
              return (
                <Link href={`/habitaciones/${zona.slug}`} className="zone-card" key={zona.slug}>
                  <div className="zone-pin">{zona.barrio}</div>
                  <h3>{zona.universidad}</h3>
                  <p>{zona.intro}</p>
                  <div className="zone-meta">
                    <span className="zone-count">{enZona.length} habitaciones</span>
                    <span className="zone-price">desde {desde}€</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="catalog" id="catalogo">
        <div className="wrap">
          <div className="section-head">
            <h2>Ultimas incorporaciones</h2>
            <p>Fichas generadas automaticamente desde el catalogo.</p>
          </div>
          <div className="card-grid">
            {pisos.map((piso) => (
              <Link href={`/habitaciones/${piso.zona}/${piso.slug}`} className="piso-card" key={piso.id}>
                <div className="piso-img">
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
          </div>
        </div>
      </section>
    </>
  );
}
