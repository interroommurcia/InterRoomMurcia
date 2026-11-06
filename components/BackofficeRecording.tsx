"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// Graba la sesión del backoffice SOLO para comercial y dirección (nunca admin),
// y la etiqueta con el rol (person property backoffice_rol) para distinguirla
// en Analytics → Grabaciones. La retención/borrado la gestiona PostHog igual
// que las grabaciones de visitantes. Se monta en AdminNav (todas las páginas
// /admin). PostHogProvider lee window.__irBackofficeRecord para no apagar la
// grabación en /admin cuando este rol sí debe grabarse.
declare global {
  interface Window { __irBackofficeRecord?: boolean }
}

export function BackofficeRecording({ rol, userId, nombre }: { rol: string; userId: string; nombre: string }) {
  useEffect(() => {
    const grabar = rol === "comercial" || rol === "direccion";
    window.__irBackofficeRecord = grabar;

    let intentos = 0;
    const aplicar = () => {
      if (!posthog.__loaded) {
        if (intentos++ < 20) setTimeout(aplicar, 300);
        return;
      }
      try {
        if (grabar) {
          posthog.identify(userId, { backoffice_rol: rol, backoffice_nombre: nombre });
          posthog.setPersonProperties({ backoffice_rol: rol });
          posthog.register({ backoffice_rol: rol });
          posthog.startSessionRecording();
        } else {
          posthog.stopSessionRecording();
        }
      } catch {}
    };
    aplicar();
  }, [rol, userId, nombre]);

  return null;
}
