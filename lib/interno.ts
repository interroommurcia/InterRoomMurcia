// Marca de "dispositivo interno" (yo). La pone el botón "No grabar mis visitas"
// (components/BotonInterno) en localStorage. Se usa para que mis propias visitas
// no cuenten en NINGUNA estadística: ni PostHog ni las vistas/clics de artículos.
export const INTERNO_FLAG = "ir_interno";

export function esInterno(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(INTERNO_FLAG) === "1";
  } catch {
    return false;
  }
}
