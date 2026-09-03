import Link from "next/link";
import Image from "next/image";
import type { Piso } from "../lib/pisos";

export default function PisoCard({ piso }: { piso: Piso }) {
  const esCompraventa = piso.categoria === "compraventa";
  return (
    <Link
      href={`/habitaciones/${piso.zona}/${piso.slug}`}
      className={`piso-card${piso.reservada ? " piso-reservada" : ""}`}
      key={piso.id}
    >
      <div className="piso-img">
        {piso.imageUrl && (
          <Image
            src={piso.imageUrl}
            alt={piso.titulo}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            style={{ objectFit: "cover" }}
            loading="lazy"
          />
        )}
        <span className={`piso-badge ${piso.disponible ? (piso.reservada ? "reservada" : "") : "no-disponible"}`}>
          {piso.reservada ? "Reservada" : piso.disponible ? "Disponible" : "No disponible"}
        </span>
        {piso.reservada && (
          <div className="piso-watermark">RESERVADA</div>
        )}
      </div>
      <div className="piso-body">
        <h4>{piso.titulo}</h4>
        <div className="loc">{piso.barrio}</div>
        <div className="piso-foot">
          <div className="piso-price">
            {esCompraventa
              ? `${piso.precioMes.toLocaleString("es-ES")}€`
              : <>{piso.precioMes}€ <span>/mes</span></>}
          </div>
          <div className="piso-arrow">-&gt;</div>
        </div>
      </div>
    </Link>
  );
}
