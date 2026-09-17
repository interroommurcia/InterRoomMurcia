import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import InversoresForm from "./InversoresForm";
import CalculadoraROI from "./CalculadoraROI";
import { WHATSAPP_NUMBER } from "../../lib/whatsapp";

export const metadata: Metadata = {
  title: "Inversores",
  description:
    "Oportunidades de inversion inmobiliaria en Murcia y Cartagena: compraventa de inmuebles y creditos NPL. Analisis de rentabilidad gratuito.",
};

const METRICAS = [
  { valor: "7-8%", label: "Rentabilidad anual media" },
  { valor: "-50%", label: "Descuento NPL vs mercado" },
  { valor: "0€", label: "Hasta que inviertas" },
  { valor: "+15%", label: "ROI creditos NPL" },
];

export default function InversoresPage() {
  return (
    <>
      {/* Hero degradado oscuro */}
      <section className="inv-hero">
        <div className="wrap inv-hero-inner">
          <Reveal>
            <div className="inv-hero-content">
              <div className="eyebrow">Para inversores · Murcia y Cartagena</div>
              <h1>
                Invierte en inmuebles
                <br />
                <em>con rentabilidad real</em>
              </h1>
              <p>
                Te ayudamos a encontrar oportunidades de inversion inmobiliaria:
                compraventa de inmuebles y creditos NPL con asesoramiento profesional.
              </p>
              <div className="hero-actions" style={{ marginTop: 28 }}>
                <a href="#lead-form" className="btn-primary">
                  Quiero invertir
                </a>
                <a href="#calculadora" className="btn-ghost">
                  Calcular rentabilidad
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="inv-metricas">
              {METRICAS.map((m) => (
                <div className="inv-metrica" key={m.label}>
                  <span className="inv-metrica-valor">{m.valor}</span>
                  <span className="inv-metrica-label">{m.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dos oportunidades lado a lado */}
      <section className="inv-oportunidades">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Dos formas de invertir</h2>
              <p>Elige la que mejor se adapte a tu perfil</p>
            </div>
          </Reveal>
          <div className="inv-cards">
            <Reveal delay={0}>
              <div className="inv-card inv-card-npl">
                <div className="inv-card-tag">NPL</div>
                <h3>
                  Compra de deuda inmobiliaria
                  <br />
                  <em>Creditos NPL:</em>
                </h3>
                <p>
                  Carteras de creditos impagados con descuentos significativos sobre el valor
                  del activo subyacente. Alto potencial de rentabilidad.
                </p>
                <ul>
                  <li>Acceso a carteras con descuentos sobre el valor real</li>
                  <li>Analisis previo del activo subyacente y riesgo</li>
                  <li>Gestion de la recuperacion: negociacion, ejecucion o venta</li>
                  <li>Rentabilidades superiores al mercado tradicional</li>
                </ul>
                <div className="inv-card-stats">
                  <div>
                    <b>-50%</b>
                    <span>precio vs mercado</span>
                  </div>
                  <div>
                    <b>+15%</b>
                    <span>rentabilidad media</span>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="inv-card inv-card-compra">
                <div className="inv-card-tag">Compraventa</div>
                <h3>Compra inmuebles por debajo de mercado</h3>
                <p>
                  Accede a oportunidades que no estan en los portales convencionales.
                  Te acompañamos desde la busqueda hasta la escritura.
                </p>
                <ul>
                  <li>Compra a particulares</li>
                  <li>Rentabilidad del 7%-8% anual</li>
                  <li>Gestion integral: busqueda, negociacion, escritura y reforma</li>
                  <li>Alquiler gestionado por InterRoom para maximizar retorno</li>
                </ul>
                <div className="inv-card-stats">
                  <div>
                    <b>7-8%</b>
                    <span>rentabilidad anual</span>
                  </div>
                  <div>
                    <b>100%</b>
                    <span>gestion incluida</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Calculadora */}
      <section className="section" id="calculadora" style={{ background: "var(--paper-dim)" }}>
        <div className="wrap">
          <Reveal>
            <div className="lead-card">
              <div>
                <h2>Calcula tu rentabilidad</h2>
                <p>
                  Introduce los datos de la inversion y calcula al instante la rentabilidad
                  bruta, neta, cashflow mensual y tiempo de recuperacion.
                </p>
              </div>
              <CalculadoraROI />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Formulario */}
      <section className="section lead-section" id="lead-form">
        <div className="wrap">
          <Reveal>
            <div className="lead-card">
              <div>
                <h2>Hablemos de tu inversion</h2>
                <p>
                  Cuentanos que tipo de inversion te interesa y te contactamos
                  con oportunidades reales en Murcia y Cartagena.
                </p>
              </div>
              <InversoresForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contacto */}
      <section className="contacto-home">
        <div className="contacto-home-overlay" />
        <Reveal direction="scale" className="wrap contacto-home-inner">
          <h2>Contacta con nosotros</h2>
          <p>Escribenos por WhatsApp o llamanos directamente.</p>
          <div className="contacto-home-actions">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <a href={`tel:+${WHATSAPP_NUMBER}`} className="btn-phone">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              +34 613 096 518
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
