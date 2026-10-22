"use client";

import posthog from "posthog-js";

/**
 * Helpers de tracking custom pensados para páginas de conversión.
 * Todos los eventos añaden el referrer y los UTM habituales para
 * que podamos cruzar luego "convirtió sí/no" con "de qué canal viene".
 */

function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  try {
    return new URL(window.location.href).searchParams.get(name) ?? "";
  } catch {
    return "";
  }
}

function baseContext(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return {
    page: window.location.pathname,
    utm_source: queryParam("utm_source"),
    utm_medium: queryParam("utm_medium"),
    utm_campaign: queryParam("utm_campaign"),
    utm_content: queryParam("utm_content"),
    utm_term: queryParam("utm_term"),
    gclid: queryParam("gclid"),
    fbclid: queryParam("fbclid"),
    referrer: document.referrer || "$direct",
    referring_domain: document.referrer
      ? (() => {
          try {
            return new URL(document.referrer).hostname;
          } catch {
            return "";
          }
        })()
      : "",
  };
}

export function trackEvent(name: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (!posthog || !posthog.__loaded) return;
  posthog.capture(name, { ...baseContext(), ...props });
}
