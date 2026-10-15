import type { Metadata } from "next";
import CalculadoraRentabilidad from "./CalculadoraRentabilidad";

export const metadata: Metadata = {
  title: "Calculadora de rentabilidad",
  description:
    "Calcula en vivo la rentabilidad de tu piso en Murcia: alquiler tradicional vs por habitaciones con la gestión integral de InterRoom.",
  robots: { index: false, follow: false },
};

export default function RentabilidadPage() {
  return <CalculadoraRentabilidad />;
}
