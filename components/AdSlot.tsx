"use client";

import { useEffect } from "react";

// Unidad de AdSense. Solo se renderiza si hay publisher id (NEXT_PUBLIC_ADSENSE_CLIENT)
// y un slot (NEXT_PUBLIC_ADSENSE_SLOT_*). Si faltan, no pinta nada: así el blog
// funciona igual hasta que tengas la cuenta aprobada y pongas las variables.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function AdSlot({ slot }: { slot?: string }) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    try {
      // @ts-expect-error adsbygoogle lo inyecta el script de AdSense
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* el bloqueador de anuncios o la falta de script: silencioso */
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <div style={{ margin: "28px 0", textAlign: "center", minHeight: 90 }} aria-hidden="true">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
