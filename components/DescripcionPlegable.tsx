"use client";

import { useRef, useState, useEffect } from "react";

// Descripción plegable con "Mostrar más / menos". Si el texto es corto, no
// muestra el botón. El <p> hereda los estilos de .ficha-desc p (pre-line, etc.).
export default function DescripcionPlegable({ texto, maxHeight = 260 }: { texto: string; maxHeight?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current) setNeedsToggle(ref.current.scrollHeight > maxHeight + 24);
  }, [texto, maxHeight]);

  return (
    <div>
      <div
        style={{
          position: "relative",
          maxHeight: expanded ? "none" : maxHeight,
          overflow: "hidden",
        }}
      >
        <p ref={ref} style={{ margin: 0 }}>{texto}</p>
        {!expanded && needsToggle && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 72,
              background: "linear-gradient(to bottom, rgba(255,255,255,0), var(--paper, #fff))",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginTop: 10,
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid var(--orange)",
            background: "#fff",
            color: "var(--orange)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {expanded ? "Mostrar menos ▲" : "Mostrar más ▼"}
        </button>
      )}
    </div>
  );
}
