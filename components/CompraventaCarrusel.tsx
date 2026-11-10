"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Piso } from "../lib/pisos";
import PisoFeatures from "./PisoFeatures";

const ESTADO_LABEL: Record<string, string> = {
  reservada: "Reservada",
  vendida: "Vendida",
  proximamente: "Próximamente",
  no_disponible: "No disponible",
};

/**
 * Tarjeta grande de compraventa en el banner del catálogo. Si hay varias,
 * rota una a una con un fundido; si solo hay una, se queda fija.
 */
export default function CompraventaCarrusel({ items }: { items: Piso[] }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setFading(false);
      }, 420);
    }, 4200);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const p = items[idx];

  return (
    <div className="cv-feat-wrap">
      <Link href={`/habitaciones/${p.zona}/${p.slug}`} className={`cv-feat-card${fading ? " is-fading" : ""}`}>
        <div className="cv-feat-img">
          {p.imageUrl && (
            <Image src={p.imageUrl} alt={p.titulo} fill sizes="260px" style={{ objectFit: "cover" }} loading="lazy" />
          )}
          {p.estado !== "disponible" && ESTADO_LABEL[p.estado] && (
            <span className="cv-feat-estado">{ESTADO_LABEL[p.estado]}</span>
          )}
        </div>
        <div className="cv-feat-body">
          <div className="cv-feat-title">{p.titulo}</div>
          <div className="cv-feat-loc">{p.barrio}</div>
          <PisoFeatures piso={p} size={16} />
          <div className="cv-feat-foot">
            <span className="cv-feat-price">{p.precioMes.toLocaleString("es-ES")}€</span>
            <span className="cv-feat-arrow" aria-hidden="true">→</span>
          </div>
        </div>
      </Link>
      {items.length > 1 && (
        <div className="cv-feat-dots" aria-hidden="true">
          {items.map((it, i) => (
            <span key={it.id} className={`cv-feat-dot${i === idx ? " is-active" : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
