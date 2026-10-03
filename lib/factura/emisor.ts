// Datos fiscales fijos del emisor (autónomo). Se copian como snapshot en cada
// factura al emitirla, así que cambiarlos aquí solo afecta a facturas futuras.
export const EMISOR = {
  nombre: "Jose Enrique Saura Gutiérrez",
  nif: "48742897-D",
  direccion: "Calle Poeta Andrés Bolarín, 4, 06, P02 D.",
  cp_ciudad: "30011 Murcia",
  telefono: "659 37 36 70",
  email: "interroommurcia@gmail.com",
  // Contacto comercial que aparece en la cabecera (WhatsApp / llamada).
  telefono_contacto: "613 096 518",
  iban: "ES73 2100 7938 1802 0007 5164",
  web: "interroommurcia.com",
} as const;

export const IVA_PCT = 21;
export const IRPF_PCT_EMPRESA = 15;
