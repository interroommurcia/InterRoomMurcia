"use client";

import { useEffect } from "react";

/**
 * Anima las flechas naranjas de las tarjetas (.piso-arrow) de una en una:
 * elige una al azar, le da un pequeño empujón a la derecha y vuelve a su
 * sitio. Nunca hay dos moviéndose a la vez y el orden es aleatorio.
 */
export default function PisoArrowMotion() {
  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let timer: number | undefined;
    let stopped = false;
    const DUR = 650; // debe coincidir con la animación CSS

    const tick = () => {
      if (stopped) return;
      const flechas = Array.from(
        document.querySelectorAll<HTMLElement>(".piso-arrow"),
      ).filter((el) => el.offsetParent !== null);

      if (flechas.length > 0) {
        const el = flechas[Math.floor(Math.random() * flechas.length)];
        el.classList.add("piso-arrow--nudge");
        window.setTimeout(() => el.classList.remove("piso-arrow--nudge"), DUR);
      }
      // Hueco aleatorio entre 1,1 s y 2,8 s antes de la siguiente.
      const gap = DUR + 450 + Math.random() * 1700;
      timer = window.setTimeout(tick, gap);
    };

    timer = window.setTimeout(tick, 900);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
