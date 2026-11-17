"use client";

import { useEffect } from "react";
import { esInterno } from "../../lib/interno";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    if (esInterno()) return; // mis propias visitas no cuentan
    fetch("/api/blog/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        event: "view",
        referrer: document.referrer || null,
        url: window.location.href,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}

export function CtaLink({
  slug,
  href,
  children,
  className,
}: {
  slug: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        if (esInterno()) return; // mis propias visitas no cuentan
        fetch("/api/blog/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, event: "cta_click" }),
        });
      }}
    >
      {children}
    </a>
  );
}
