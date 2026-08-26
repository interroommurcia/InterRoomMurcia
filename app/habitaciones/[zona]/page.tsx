import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { zonas, zonaPorSlug, pisosPorZona } from "../../../lib/pisos";

export function generateStaticParams() {
  return zonas.map((z) => ({ zona: z.slug }));
}

export function generateMetadata({ params }: { params: { zona: string } }): Metadata {
  const zona = zonaPorSlug(params.zona);
  if (zona) return { title: zona.titulo, description: zona.intro };
  const label = params.zona.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title: `Activos en ${label}`, description: `Activos de compraventa en ${label}` };
}

export default async function ZonaPage({ params }: { params: { zona: string } }) {
  const zona = zonaPorSlug(params.zona);
  const pisosZona = await pisosPorZona(zona?.slug ?? params.zona);
  if (!zona && pisosZona.length === 0) return notFound();

  const label = zona?.barrio ?? params.zona.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const esAlquiler = !!zona;

  return (
    <>
      <section className="zona-hero">
        <div className="wrap">
          {zona && <div className="eyebrow">{zona.universidad}</div>}
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            {zona ? zona.titulo : `Activos en ${label}`}
          </h1>
          {zona && (
            <div className="zona-body" style={{ marginTop: 24 }}>
              {zona.contenido.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="catalog">
        <div className="wrap">
          <div className="section-head">
            <h2>{esAlquiler ? `Habitaciones en ${label}` : `Activos en ${label}`}</h2>
            <p>{pisosZona.length} {esAlquiler ? "habitaciones encontradas" : "activos encontrados"}</p>
          </div>
          <div className="card-grid">
            {pisosZona.map((piso) => (
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
                      {piso.categoria === "compraventa" ? `${piso.precioMes.toLocaleString("es-ES")}€` : <>{piso.precioMes}€ <span>/mes</span></>}
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
