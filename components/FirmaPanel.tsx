"use client";

import { useEffect, useRef, useState } from "react";
import type { Firma } from "../lib/contratos";

type Props = {
  /** Rol legible mostrado en el header del panel: "El Propietario" | "La Agencia" */
  rolLabel: string;
  /** Valor inicial del nombre, si lo conocemos (del CRM o del contrato) */
  defaultName?: string;
  /** Valor inicial del DNI/CIF */
  defaultDni?: string;
  /** Callback: construye la firma y la envía al backend */
  onSubmit: (firma: Firma) => Promise<void>;
  onCancel?: () => void;
};

export default function FirmaPanel({ rolLabel, defaultName, defaultDni, onSubmit, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modo, setModo] = useState<"draw" | "electronic">("draw");
  const [nombre, setNombre] = useState(defaultName ?? "");
  const [dni, setDni] = useState(defaultDni ?? "");
  const [eName, setEName] = useState(defaultName ?? "");
  const [eAck, setEAck] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Setup canvas DPR + listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "#1a1a1a";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const dibujar = (() => {
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    const pos = (e: PointerEvent) => {
      const canvas = canvasRef.current!;
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    return {
      down(e: React.PointerEvent<HTMLCanvasElement>) {
        drawing = true;
        setHasInk(true);
        const p = pos(e.nativeEvent);
        lastX = p.x;
        lastY = p.y;
        try {
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        } catch {}
        e.preventDefault();
      },
      move(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!drawing) return;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const p = pos(e.nativeEvent);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastX = p.x;
        lastY = p.y;
        e.preventDefault();
      },
      up() {
        drawing = false;
      },
    };
  })();

  function limpiar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  async function enviar() {
    setError("");
    if (!nombre.trim() || !dni.trim()) {
      setError("Rellena nombre y DNI/CIF");
      return;
    }
    let firma: Firma;
    if (modo === "draw") {
      if (!hasInk) {
        setError("Dibuja tu firma primero");
        return;
      }
      const canvas = canvasRef.current!;
      firma = {
        mode: "draw",
        dataUrl: canvas.toDataURL("image/png"),
        nombre: nombre.trim(),
        dni: dni.trim(),
        ts: new Date().toISOString(),
      };
    } else {
      if (!eName.trim() || !eAck) {
        setError("Escribe tu nombre y marca la casilla de conformidad");
        return;
      }
      firma = {
        mode: "electronic",
        nombre_tipeado: eName.trim(),
        nombre: nombre.trim(),
        dni: dni.trim(),
        ts: new Date().toISOString(),
      };
    }
    setEnviando(true);
    try {
      await onSubmit(firma);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al firmar");
      setEnviando(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 16, background: "#fff", maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {rolLabel}
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <TabBtn active={modo === "draw"} onClick={() => setModo("draw")}>
            Manuscrita
          </TabBtn>
          <TabBtn active={modo === "electronic"} onClick={() => setModo("electronic")}>
            Electrónica
          </TabBtn>
        </div>
      </div>

      {modo === "draw" ? (
        <div style={{ position: "relative", border: "1px dashed #ddd", background: "#fafaf8", height: 190, overflow: "hidden", borderRadius: 8 }}>
          <canvas
            ref={canvasRef}
            style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "crosshair" }}
            onPointerDown={dibujar.down}
            onPointerMove={dibujar.move}
            onPointerUp={dibujar.up}
            onPointerCancel={dibujar.up}
            onPointerLeave={dibujar.up}
          />
          {!hasInk && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "0.9rem",
                color: "#999",
                letterSpacing: "0.08em",
                pointerEvents: "none",
              }}
            >
              Firma con el dedo, lápiz o ratón
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 8, background: "#fff" }}>
          {eName && (
            <div
              style={{
                fontFamily: "'Caveat', 'Brush Script MT', cursive",
                fontSize: "26pt",
                padding: "4px 0 8px",
                borderBottom: "1px solid #1a1a1a",
                marginBottom: 10,
                lineHeight: 1,
              }}
            >
              {eName}
            </div>
          )}
          <input
            type="text"
            value={eName}
            onChange={(e) => setEName(e.target.value)}
            placeholder="Nombre tal como figura en tu DNI"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: "0.95rem", marginBottom: 10 }}
          />
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.82rem", color: "#555", lineHeight: 1.5, cursor: "pointer" }}>
            <input type="checkbox" checked={eAck} onChange={(e) => setEAck(e.target.checked)} style={{ marginTop: 3, accentColor: "#ea6a12" }} />
            <span>Firmo electrónicamente este contrato conforme a la Ley 6/2020 y al Reglamento (UE) 910/2014.</span>
          </label>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo"
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: "0.95rem" }}
        />
        <input
          type="text"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="DNI / CIF"
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: "0.95rem" }}
        />
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        {modo === "draw" && (
          <button
            type="button"
            onClick={limpiar}
            style={{ padding: "9px 14px", border: "1px solid #ddd", background: "#fff", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem" }}
          >
            Limpiar
          </button>
        )}
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          style={{
            padding: "9px 20px",
            background: "var(--orange)",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 500,
            cursor: enviando ? "wait" : "pointer",
            opacity: enviando ? 0.6 : 1,
            fontSize: "0.9rem",
            flex: 1,
            maxWidth: 240,
          }}
        >
          {enviando ? "Firmando…" : "Firmar"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: "9px 14px", border: "1px solid #ddd", background: "#fff", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem" }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        border: `1px solid ${active ? "#1a1a1a" : "#ddd"}`,
        color: active ? "#1a1a1a" : "#666",
        background: "transparent",
        fontSize: "0.72rem",
        fontWeight: 400,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        borderRadius: 4,
      }}
    >
      {children}
    </button>
  );
}
