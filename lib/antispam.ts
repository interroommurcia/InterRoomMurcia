// Detecta nombres generados por bots (strings aleatorios)
export function esNombreBot(nombre: string): boolean {
  if (!nombre) return false;
  const n = nombre.trim();

  // Demasiado largo para un nombre real
  if (n.length > 40) return true;

  // Solo letras sin espacios y muy largo (>14 chars) = aleatorio
  if (n.length > 14 && !/\s/.test(n)) return true;

  // Mezcla mayúsculas/minúsculas rara (ej: "QMNiGcWxKm")
  const cambiosMay = n.split("").filter((c, i) => {
    if (i === 0) return false;
    const prev = n[i - 1];
    return /[a-zA-Z]/.test(c) && /[a-zA-Z]/.test(prev) &&
      (c === c.toUpperCase()) !== (prev === prev.toUpperCase());
  }).length;
  if (cambiosMay > 4) return true;

  // Ratio consonantes/vocales muy alto = gibberish
  const letras = n.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, "");
  if (letras.length >= 6) {
    const vocales = letras.replace(/[^aeiouáéíóúAEIOUÁÉÍÓÚ]/g, "").length;
    if (vocales / letras.length < 0.15) return true;
  }

  return false;
}

// Detecta teléfonos claramente falsos
export function esTelefonoBot(tel: string): boolean {
  const digits = tel.replace(/\D/g, "");
  // Demasiado largo o corto
  if (digits.length > 15 || digits.length < 6) return true;
  // Todas las cifras iguales
  if (/^(\d)\1+$/.test(digits)) return true;
  // Contiene letras (no debería)
  if (/[a-zA-Z]{3,}/.test(tel)) return true;
  return false;
}

// Detecta emails de spam comunes
export function esEmailBot(email: string): boolean {
  if (!email) return false;
  const local = email.split("@")[0] || "";
  // Parte local con muchos puntos (ej: "l.e.s.l.i.do.ug.h.e.r")
  if ((local.match(/\./g) || []).length > 5) return true;
  // Parte local demasiado larga y con números intercalados
  if (local.length > 30 && /\d/.test(local)) return true;
  return false;
}

export function esBot(data: { nombre?: string; telefono?: string; email?: string }): boolean {
  if (data.nombre && esNombreBot(data.nombre)) return true;
  if (data.telefono && esTelefonoBot(data.telefono)) return true;
  if (data.email && esEmailBot(data.email)) return true;
  return false;
}
