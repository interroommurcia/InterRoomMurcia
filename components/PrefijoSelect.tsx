"use client";

import { useEffect, useRef, useState } from "react";
import { PREFIJOS } from "../lib/telefono";

/**
 * Selector de prefijo con bandera real (imagen), porque los emoji de bandera
 * no se renderizan en Windows (muestran "ES", "PT"…). El <select> nativo no
 * admite imágenes, así que usamos un dropdown propio.
 */
export default function PrefijoSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actual = PREFIJOS.find((p) => p.code === value) || PREFIJOS[0];

  useEffect(() => {
    if (!abierto) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [abierto]);

  function flag(iso: string) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${iso}.png`}
        srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
        width={20}
        height={15}
        alt=""
        style={{ borderRadius: 2, display: "block", flex: "0 0 auto" }}
      />
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setAbierto((v) => !v); }}
        aria-label="Prefijo país"
        style={{
          display: "flex", alignItems: "center", gap: 6, height: "100%",
          padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db",
          background: "#fff", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {flag(actual.iso)}
        <span>{actual.code}</span>
        <span style={{ color: "#9ca3af", fontSize: 10 }}>▾</span>
      </button>

      {abierto && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 10,
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: 4,
            maxHeight: 240, overflowY: "auto", minWidth: 120,
          }}
        >
          {PREFIJOS.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(p.code); setAbierto(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 10px", borderRadius: 7, border: "none",
                background: p.code === value ? "#fff7ed" : "transparent",
                fontSize: 14, cursor: "pointer", textAlign: "left",
              }}
            >
              {flag(p.iso)}
              <span>{p.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
