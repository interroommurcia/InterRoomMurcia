import Link from "next/link";
import Image from "next/image";
import type { Piso } from "../lib/pisos";

const ESTADO_LABEL: Record<string, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  alquilada: "Alquilada",
  vendida: "Vendida",
  no_disponible: "No disponible",
};

const ESTADO_WATERMARK: Record<string, string> = {
  reservada: "RESERVADA",
  alquilada: "ALQUILADA",
  vendida: "VENDIDA",
};

export default function PisoCard({ piso }: { piso: Piso }) {
  const esCompraventa = piso.categoria === "compraventa";
  const estado = piso.estado || "disponible";
  const showWatermark = estado in ESTADO_WATERMARK;
  const dimmed = estado !== "disponible";

  return (
    <Link
      href={`/habitaciones/${piso.zona}/${piso.slug}`}
      className={`piso-card${dimmed ? " piso-dimmed" : ""}`}
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
        <span className={`piso-badge estado-${estado}`}>
          {ESTADO_LABEL[estado] || "Disponible"}
        </span>
        {showWatermark && (
          <div className={`piso-watermark watermark-${estado}`}>
            {ESTADO_WATERMARK[estado]}
          </div>
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
