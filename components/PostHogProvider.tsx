"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

// Mismo literal que ExitIntent.EXIT_INTENT_FLAG. No lo importamos para
// que PostHogProvider no arrastre la landing a su bundle.
const EXIT_INTENT_FLAG = "venta_exit_intent_shown_at";
// Ventana de tiempo tras ver el popup en la que una navegación cuenta
// como "siguiente página tras exit intent".
const NEXT_PAGE_WINDOW_MS = 60_000;

// Mismo literal que BotonInterno.INTERNO_FLAG. Si este dispositivo está
// marcado como interno (yo), no grabamos la sesión.
const INTERNO_FLAG = "ir_interno";
function esInterno(): boolean {
  try { return localStorage.getItem(INTERNO_FLAG) === "1"; } catch { return false; }
}

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || !posthog.__loaded) return;
    const url = window.location.origin + pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", {
      $current_url: url,
      $referrer: document.referrer || "$direct",
      $referring_domain: document.referrer ? new URL(document.referrer).hostname : "",
    });

    // Si el usuario vio el popup de exit intent en /venta y ahora
    // navega a otra ruta dentro del mismo sitio, registramos a dónde
    // fue — así sabes si abandonan al blog, al catálogo o se van.
    try {
      const raw = sessionStorage.getItem(EXIT_INTENT_FLAG);
      if (raw && !pathname.startsWith("/venta")) {
        const shownAt = Number(raw);
        if (Number.isFinite(shownAt) && Date.now() - shownAt <= NEXT_PAGE_WINDOW_MS) {
          posthog.capture("venta_exit_intent_next_page", {
            next_page: pathname,
            ms_since_shown: Date.now() - shownAt,
          });
        }
        sessionStorage.removeItem(EXIT_INTENT_FLAG);
      }
    } catch {
      /* no-op */
    }

    // Pausa el session replay en el panel admin o si este dispositivo está
    // marcado como interno — no interesa grabar nuestras propias navegaciones.
    if (pathname.startsWith("/admin") || esInterno()) {
      try { posthog.stopSessionRecording(); } catch {}
    } else {
      try { posthog.startSessionRecording(); } catch {}
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: { password: true, email: true },
      },
      // Si la primera carga es en /admin arrancamos sin grabar; el
      // efecto de PostHogPageview volverá a encender la grabación al
      // salir del backoffice.
      disable_session_recording:
        typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/admin") || esInterno()),
      persistence: "localStorage",
    });

    // Reaplica la marca de interno en cada carga (por si se limpió la
    // persistencia): tagea los eventos y la persona para poder filtrarlos.
    if (esInterno()) {
      try {
        posthog.register({ es_interno: "true" });
        posthog.setPersonProperties({ es_interno: "true" });
      } catch {}
    }
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </>
  );
}
