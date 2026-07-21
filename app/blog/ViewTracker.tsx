"use client";

import { useEffect } from "react";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch("/api/blog/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event: "view", referrer: document.referrer || null }),
    });
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
      onClick={() =>
        fetch("/api/blog/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, event: "cta_click" }),
        })
      }
    >
      {children}
    </a>
  );
}
