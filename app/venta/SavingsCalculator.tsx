"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../../lib/posthog-client";

const TRAD_RATE = 0.03;
const IR_RATE = 0.015;
const MIN = 50000;
const MAX = 600000;
const STEP = 5000;

export default function SavingsCalculator() {
  const [price, setPrice] = useState(180000);
  const fired = useRef(false);
  const debounceRef = useRef<number | null>(null);

  // Fire "venta_calc_use" cuando el usuario mueve el slider y lo deja
  // quieto 800ms. Solo una vez por sesión para no inundar PostHog.
  useEffect(() => {
    if (price === 180000 || fired.current) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      const tradCost = Math.round(price * TRAD_RATE * 1.21);
      const irCost = Math.round(price * IR_RATE * 1.21);
      trackEvent("venta_calc_use", {
        precio: price,
        ahorro: tradCost - irCost,
      });
    }, 800);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [price]);

  const IVA_RATE = 0.21;
  const tradCost = Math.round(price * TRAD_RATE);
  const tradCostIva = Math.round(tradCost * (1 + IVA_RATE));
  const irCost = Math.round(price * IR_RATE);
  const irCostIva = Math.round(irCost * (1 + IVA_RATE));
  const savings = tradCostIva - irCostIva;
  const pct = ((price - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="calc">
      <div className="calc-header">
        <h2>Calcula tu ahorro real</h2>
        <p>Mueve el precio y compara lo que pagarías</p>
      </div>

      <div className="calc-slider-wrap">
        <label className="calc-price-label" htmlFor="calc-price">
          Precio de venta
        </label>
        <output className="calc-price-output">
          {price.toLocaleString("es-ES")} €
        </output>
        <input
          id="calc-price"
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="calc-range"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
        <div className="calc-range-labels">
          <span>{(MIN / 1000).toFixed(0)}k €</span>
          <span>{(MAX / 1000).toFixed(0)}k €</span>
        </div>
      </div>

      <div className="calc-results">
        <div className="calc-result calc-result--trad">
          <span className="calc-result-label">Agencia tradicional (3%)</span>
          <span className="calc-result-value">{tradCost.toLocaleString("es-ES")} €</span>
          <span className="calc-result-iva">+IVA: {tradCostIva.toLocaleString("es-ES")} €</span>
        </div>
        <div className="calc-result calc-result--ir">
          <span className="calc-result-label">InterRoom (1,5%)</span>
          <span className="calc-result-value">{irCost.toLocaleString("es-ES")} €</span>
          <span className="calc-result-iva">+IVA: {irCostIva.toLocaleString("es-ES")} €</span>
        </div>
      </div>

      <div className="calc-savings">
        <span className="calc-savings-label">Te ahorras</span>
        <span className="calc-savings-value">{savings.toLocaleString("es-ES")} €</span>
      </div>

      <a href="#lead-form" className="btn-primary calc-cta">
        Quiero ahorrarme {savings.toLocaleString("es-ES")} €
      </a>
    </div>
  );
}
