import type { Piso } from "../lib/pisos";

type Props = {
  piso: Pick<Piso, "numHabitaciones" | "numBanos" | "terraza" | "piscina" | "garaje">;
  size?: number;
  className?: string;
};

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * Iconos en gris de las características del piso. Solo aparece el icono de
 * los campos rellenados (habitaciones/baños > 0, terraza/piscina/garaje = sí).
 * Si no hay ninguno, no renderiza nada.
 */
export default function PisoFeatures({ piso, size = 16, className }: Props) {
  const items: React.ReactNode[] = [];

  if (piso.numHabitaciones && piso.numHabitaciones > 0) {
    items.push(
      <span key="hab" className="pf-feat" title="Habitaciones">
        <svg viewBox="0 0 24 24" width={size} height={size} {...S} aria-hidden="true">
          <path d="M2 4v16" />
          <path d="M2 8h18a2 2 0 0 1 2 2v10" />
          <path d="M2 17h20" />
          <path d="M6 8v9" />
        </svg>
        {piso.numHabitaciones}
      </span>,
    );
  }

  if (piso.numBanos && piso.numBanos > 0) {
    items.push(
      <span key="ban" className="pf-feat" title="Baños">
        <svg viewBox="0 0 24 24" width={size} height={size} {...S} aria-hidden="true">
          <path d="M5 12V5.5a2.5 2.5 0 0 1 5 0V12" />
          <line x1="10" y1="5" x2="8" y2="7" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M3 12v2a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-2" />
          <line x1="7" y1="19" x2="7" y2="21" />
          <line x1="17" y1="19" x2="17" y2="21" />
        </svg>
        {piso.numBanos}
      </span>,
    );
  }

  if (piso.terraza) {
    items.push(
      <span key="ter" className="pf-feat" title="Terraza">
        <svg viewBox="0 0 24 24" width={size} height={size} {...S} aria-hidden="true">
          <path d="M22 12a10 10 0 0 0-20 0Z" />
          <path d="M12 12v7a2.5 2.5 0 0 0 5 0" />
          <path d="M12 2v2" />
        </svg>
      </span>,
    );
  }

  if (piso.piscina) {
    items.push(
      <span key="pis" className="pf-feat" title="Piscina">
        <svg viewBox="0 0 24 24" width={size} height={size} {...S} aria-hidden="true">
          <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.4 2 5 2c1.3 0 1.9-.5 2.5-1" />
          <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2c1.3 0 1.9-.5 2.5-1" />
          <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.4 2 5 2c1.3 0 1.9-.5 2.5-1" />
        </svg>
      </span>,
    );
  }

  if (piso.garaje) {
    items.push(
      <span key="gar" className="pf-feat" title="Plaza de garaje">
        <svg viewBox="0 0 24 24" width={size} height={size} {...S} aria-hidden="true">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </span>,
    );
  }

  if (items.length === 0) return null;

  return <div className={`piso-features${className ? ` ${className}` : ""}`}>{items}</div>;
}
