"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

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

    // Pausa el session replay en el panel admin — no interesa grabar
    // nuestras propias navegaciones ni datos sensibles del backoffice.
    if (!posthog.__loaded) return;
    if (pathname.startsWith("/admin")) {
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
        typeof window !== "undefined" && window.location.pathname.startsWith("/admin"),
      persistence: "localStorage",
    });
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
