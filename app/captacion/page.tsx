import type { Metadata } from "next";
import HojaCaptacion from "./HojaCaptacion";

export const metadata: Metadata = {
  title: "Vende tu casa — Hoja de captación",
  description:
    "Hoja para clientes que venden su casa con InterRoom Murcia: datos del contacto, descripción y QR a la web. Comisión 1,5%.",
  robots: { index: false, follow: false },
};

export default function CaptacionPage() {
  return <HojaCaptacion />;
}
