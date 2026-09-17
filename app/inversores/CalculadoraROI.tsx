"use client";

import { useState } from "react";

export default function CalculadoraROI() {
  const [precio, setPrecio] = useState("");
  const [alquiler, setAlquiler] = useState("");
  const [gastos, setGastos] = useState("");

  const p = Number(precio) || 0;
  const a = Number(alquiler) || 0;
  const g = Number(gastos) || 0;

  const ingresosAnuales = a * 12;
  const rentBruta = p > 0 ? (ingresosAnuales / p) * 100 : 0;
  const rentNeta = p > 0 ? ((ingresosAnuales - g) / p) * 100 : 0;
  const cashflow = a - g / 12;
  const payback = ingresosAnuales > g ? p / (ingresosAnuales - g) : 0;

  const hayDatos = p > 0 && a > 0;

  return (
    <div className="calculadora-roi">
      <div className="calculadora-inputs">
        <label>
          Precio de compra (€)
          <input type="number" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="120000" />
        </label>
        <label>
          Alquiler mensual esperado (€)
          <input type="number" min={0} value={alquiler} onChange={(e) => setAlquiler(e.target.value)} placeholder="800" />
        </label>
        <label>
          Gastos anuales estimados (€)
          <input type="number" min={0} value={gastos} onChange={(e) => setGastos(e.target.value)} placeholder="1500" />
        </label>
      </div>
      {hayDatos && (
        <div className="calculadora-resultados">
          <div className="calculadora-resultado">
            <span className="calculadora-valor">{rentBruta.toFixed(1)}%</span>
            <span className="calculadora-label">Rentabilidad bruta</span>
          </div>
          <div className="calculadora-resultado">
            <span className="calculadora-valor">{rentNeta.toFixed(1)}%</span>
            <span className="calculadora-label">Rentabilidad neta</span>
          </div>
          <div className="calculadora-resultado">
            <span className="calculadora-valor">{cashflow.toFixed(0)}€</span>
            <span className="calculadora-label">Cashflow mensual</span>
          </div>
          <div className="calculadora-resultado">
            <span className="calculadora-valor">{payback > 0 ? `${payback.toFixed(1)} años` : "—"}</span>
            <span className="calculadora-label">Recuperacion inversion</span>
          </div>
        </div>
      )}
    </div>
  );
}
