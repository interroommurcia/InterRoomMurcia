// Reglas de teléfono por prefijo internacional.
// Fuente única de verdad: se usa en el cliente (ProximamenteCard) y en el
// servidor (/api/leads-proximamente) para que un número con dígitos de más o
// de menos nunca se acepte, aunque se salte la validación del navegador.

export type Prefijo = {
  code: string;
  label: string;
  minDigits: number;
  maxDigits: number;
  mobileHint?: RegExp;
};

export const PREFIJOS: Prefijo[] = [
  { code: "+34", label: "🇪🇸 +34", minDigits: 9, maxDigits: 9, mobileHint: /^[6789]/ },
  { code: "+351", label: "🇵🇹 +351", minDigits: 9, maxDigits: 9 },
  { code: "+33", label: "🇫🇷 +33", minDigits: 9, maxDigits: 9 },
  { code: "+39", label: "🇮🇹 +39", minDigits: 9, maxDigits: 11 },
  { code: "+44", label: "🇬🇧 +44", minDigits: 10, maxDigits: 10 },
  { code: "+49", label: "🇩🇪 +49", minDigits: 10, maxDigits: 11 },
  { code: "+212", label: "🇲🇦 +212", minDigits: 9, maxDigits: 9 },
  { code: "+40", label: "🇷🇴 +40", minDigits: 9, maxDigits: 9 },
  { code: "+380", label: "🇺🇦 +380", minDigits: 9, maxDigits: 9 },
  { code: "+1", label: "🇺🇸 +1", minDigits: 10, maxDigits: 10 },
  { code: "+52", label: "🇲🇽 +52", minDigits: 10, maxDigits: 10 },
  { code: "+54", label: "🇦🇷 +54", minDigits: 10, maxDigits: 11 },
  { code: "+57", label: "🇨🇴 +57", minDigits: 10, maxDigits: 10 },
  { code: "+58", label: "🇻🇪 +58", minDigits: 10, maxDigits: 10 },
  { code: "+51", label: "🇵🇪 +51", minDigits: 9, maxDigits: 9 },
  { code: "+593", label: "🇪🇨 +593", minDigits: 9, maxDigits: 9 },
];

/** Devuelve un mensaje de error si el número no encaja con el prefijo, o null si es válido. */
export function validarTelefono(prefijo: string, digitos: string): string | null {
  const p = PREFIJOS.find((x) => x.code === prefijo);
  if (!p) return "Prefijo no válido.";
  if (!/^\d+$/.test(digitos)) return "El teléfono solo puede contener números.";
  if (digitos.length < p.minDigits || digitos.length > p.maxDigits) {
    return p.minDigits === p.maxDigits
      ? `El teléfono debe tener ${p.minDigits} dígitos.`
      : `El teléfono debe tener entre ${p.minDigits} y ${p.maxDigits} dígitos.`;
  }
  if (/^(\d)\1+$/.test(digitos)) return "Introduce un número real.";
  if (p.mobileHint && !p.mobileHint.test(digitos)) {
    return "Para España, el número debe empezar por 6, 7, 8 o 9.";
  }
  return null;
}

/**
 * Separa un teléfono completo (p.ej. "+34 612345678" o "+34612345678") en
 * prefijo + dígitos nacionales, probando los prefijos de más largo a más corto
 * para no confundir +34 con +351. Devuelve null si no empieza por un prefijo conocido.
 */
export function separarPrefijo(telefono: string): { prefijo: string; digitos: string } | null {
  const limpio = telefono.replace(/[^\d+]/g, "");
  if (!limpio.startsWith("+")) return null;
  const ordenados = [...PREFIJOS].sort((a, b) => b.code.length - a.code.length);
  for (const p of ordenados) {
    if (limpio.startsWith(p.code)) {
      return { prefijo: p.code, digitos: limpio.slice(p.code.length) };
    }
  }
  return null;
}
