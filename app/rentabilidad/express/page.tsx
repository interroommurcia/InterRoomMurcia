import type { Metadata } from "next";
import CalculadoraExpress from "./CalculadoraExpress";

export const metadata: Metadata = {
  title: "Rentabilidad express",
  description:
    "Informe rápido de rentabilidad estimada de tu piso alquilado por habitaciones con la gestión de InterRoom Murcia.",
  robots: { index: false, follow: false },
};

export default function RentabilidadExpressPage() {
  return <CalculadoraExpress />;
}
