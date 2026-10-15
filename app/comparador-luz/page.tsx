import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import ComparadorForm from "./ComparadorForm";

export const metadata: Metadata = {
  title: "Comparador de factura de la luz | InterRoom Murcia",
  description:
    "Sube tu factura de la luz o introduce tus datos y te decimos cuánto puedes ahorrar. Te llamamos sin compromiso.",
};

const COMERCIALIZADORAS = [
  { nombre: "Iberdrola", margen: 0.18 },
  { nombre: "Endesa", margen: 0.16 },
  { nombre: "Naturgy", margen: 0.17 },
  { nombre: "Repsol", margen: 0.14 },
  { nombre: "TotalEnergies", margen: 0.13 },
  { nombre: "Holaluz", margen: 0.08 },
  { nombre: "Octopus Energy", margen: 0.07 },
  { nombre: "Otra", margen: 0.15 },
];

export default function ComparadorLuzPage() {
  return (
    <>
      <section className="comp-hero">
        <div className="wrap">
          <Reveal>
            <div className="comp-hero-inner">
              <div className="comp-hero-badge">
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
                  <path d="M10 1L6 12h4l-1 7 5-11h-4l1-7z" fill="var(--orange)" />
                </svg>
                Servicio gratuito para propietarios
              </div>
              <h1>
                ¿Estás pagando de más
                <br />
                <em>en tu factura de la luz?</em>
              </h1>
              <p className="comp-hero-sub">
                Sube tu factura o introduce los datos básicos y te decimos cuánto
                puedes ahorrar. <strong>Te llamamos en 24h</strong> con una propuesta
                personalizada, sin compromiso.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="comp-form-section">
        <div className="wrap">
          <Reveal>
            <ComparadorForm comercializadoras={COMERCIALIZADORAS.map((c) => c.nombre)} />
          </Reveal>
        </div>
      </section>

      <section className="comp-info">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>¿Cómo funciona?</h2>
            </div>
          </Reveal>
          <div className="comp-pasos">
            <Reveal delay={0}>
              <div className="comp-paso">
                <div className="comp-paso-num">1</div>
                <h3>Sube tu factura o rellena los datos</h3>
                <p>Puedes hacernos una foto de tu factura o introducir el importe y la comercializadora.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="comp-paso">
                <div className="comp-paso-num">2</div>
                <h3>Analizamos tu consumo</h3>
                <p>Comparamos tu tarifa actual con las mejores ofertas del mercado para tu perfil.</p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="comp-paso">
                <div className="comp-paso-num">3</div>
                <h3>Te llamamos con tu ahorro</h3>
                <p>En menos de 24h te decimos cuánto puedes ahorrar y te ayudamos a cambiar si quieres.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
