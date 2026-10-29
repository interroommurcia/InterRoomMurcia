"use client";

import { useEffect } from "react";

/**
 * Registra, por delegación, el clic en CUALQUIER enlace dentro del artículo
 * (enlaces del texto, CTAs de sección, CTA final, recursos de afiliado…), para
 * poder desglosar en el backoffice qué enlaces concretos se pulsan. Un único
 * listener evita tener que envolver cada <a> (muchos vienen de HTML inyectado).
 */
export default function ArticleLinkTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const cont = document.querySelector(".article-wrap");
    if (!cont) return;
    let ultimo = ""; // dedupe de dobles disparos del mismo enlace
    let ultimoTs = 0;

    function onClick(e: Event) {
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.href || "";
      if (!href || href.startsWith("javascript:") || href.endsWith("#")) return;
      const texto = (a.textContent || "").trim().slice(0, 120);
      const ahora = Date.now();
      if (href === ultimo && ahora - ultimoTs < 600) return;
      ultimo = href; ultimoTs = ahora;
      try {
        fetch("/api/blog/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, event: "link_click", href: href.slice(0, 400), text: texto, url: window.location.href }),
          keepalive: true,
        }).catch(() => {});
      } catch { /* no-op */ }
    }

    cont.addEventListener("click", onClick, true);
    return () => cont.removeEventListener("click", onClick, true);
  }, [slug]);

  return null;
}
