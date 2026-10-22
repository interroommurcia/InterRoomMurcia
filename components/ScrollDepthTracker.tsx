"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Dispara eventos `scroll_depth` cuando el usuario cruza el 25/50/75/100 %
 * del alto total del documento. Cada umbral se registra UNA sola vez por
 * sesión y por ruta (clave en sessionStorage).
 *
 * Montar el componente dentro de la página concreta a trackear.
 * Props:
 *   - page: identificador legible (ej. "venta") para agrupar en PostHog
 */
export default function ScrollDepthTracker({ page }: { page: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const THRESHOLDS = [25, 50, 75, 100] as const;
    const storageKey = `scroll_depth_${page}`;
    let fired: number[] = [];
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) fired = JSON.parse(raw) as number[];
    } catch {
      /* no-op */
    }

    function pct(): number {
      const doc = document.documentElement;
      const total = Math.max(doc.scrollHeight - window.innerHeight, 1);
      return Math.min(100, Math.round(((window.scrollY || 0) / total) * 100));
    }

    let scheduled = false;
    function tick() {
      scheduled = false;
      const p = pct();
      for (const t of THRESHOLDS) {
        if (p >= t && !fired.includes(t)) {
          fired.push(t);
          try {
            sessionStorage.setItem(storageKey, JSON.stringify(fired));
          } catch {
            /* no-op */
          }
          if (posthog && posthog.__loaded) {
            posthog.capture("scroll_depth", { page, depth: t });
          }
        }
      }
    }

    function onScroll() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(tick);
    }

    // Primer tick inmediato (por si la página carga ya scrolleada)
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);

  return null;
}
