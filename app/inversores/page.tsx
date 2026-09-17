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

function BuildingIcon() {
  return (
    <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="32" height="30" rx="3" stroke="currentColor" strokeWidth="2.4" />
      <path d="M8 20h32M20 12v30M28 12v30" stroke="currentColor" strokeWidth="2.4" />
      <path d="M13 25h3M13 31h3M13 37h3M33 25h-3M33 31h-3M33 37h-3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 8l6-4 6 4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <path d="M14 34V24M22 34V18M30 34V22M38 34V14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="var(--orange)" />
      <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={item}>
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function InversoresPage() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Para inversores · Murcia y Cartagena</div>
            <h1>
              Invierte en inmuebles
              <br />
              <em>con rentabilidad real</em>
            </h1>
            <p className="hero-sub">
              Te ayudamos a encontrar oportunidades de inversion inmobiliaria en Murcia:
              compraventa de inmuebles y creditos NPL con asesoramiento profesional.
            </p>
            <div className="hero-actions">
              <a href="#lead-form" className="btn-primary">
                Quiero invertir
              </a>
              <a href="#calculadora" className="btn-ghost">
                Calcular rentabilidad
              </a>
            </div>
          </div>
          <div className="hero-side">
            <div>
              <div className="tag">Inversion inmobiliaria</div>
              <div className="hero-side-title">Murcia y Cartagena</div>
              <p style={{ marginTop: 10, fontSize: "0.85rem", opacity: 0.9 }}>
                Mercado con alta demanda de alquiler
                <br />
                y precios competitivos frente a otras ciudades
              </p>
            </div>
            <div className="hero-stats">
              <div>
                <b>Analisis</b>
                <span>de rentabilidad gratuito</span>
              </div>
              <div>
                <b>0€</b>
                <span>hasta que inviertas</span>
              </div>
              <div>
                <b>NPL</b>
                <span>creditos con descuento</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature" id="npl">
        <div className="wrap feature-grid">
          <Reveal className="feature-text">
            <h2>Compra de deuda inmobiliaria</h2>
            <p className="feature-lead">
              Carteras de creditos impagados con descuentos significativos sobre el valor
              del activo subyacente. Una alternativa de inversion con alto potencial.
            </p>
            <CheckList
              items={[
                "Acceso a carteras de creditos con descuentos sobre el valor real",
                "Analisis previo del activo subyacente y riesgo",
                "Gestion de la recuperacion: negociacion, ejecucion o venta del activo",
                "Rentabilidades superiores al mercado tradicional",
              ]}
            />
          </Reveal>
          <Reveal delay={120}>
            <div className="feature-visual tone-solid">
              <ChartIcon />
              <div className="visual-caption">Creditos NPL</div>
              <div className="visual-sub">Non-Performing Loans con descuento</div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="feature" id="compraventa">
        <div className="wrap feature-grid reverse">
          <Reveal>
            <div className="feature-visual tone-paper">
              <BuildingIcon />
              <div className="visual-caption">Compraventa</div>
              <div className="visual-sub">Inmuebles con potencial de revalorizacion</div>
            </div>
          </Reveal>
          <Reveal className="feature-text" delay={120}>
            <h2>Compra inmuebles por debajo de mercado</h2>
            <p className="feature-lead">
              Accede a oportunidades que no estan en los portales convencionales.
              Te acompañamos en todo el proceso, desde la busqueda hasta la escritura.
            </p>
            <CheckList
              items={[
                "Compra a particulares",
                "Rentabilidad del 7%-8% anual",
                "Gestion integral: busqueda, negociacion, escritura y reforma si es necesario",
                "Opcion de alquiler gestionado por InterRoom para maximizar el retorno",
              ]}
            />
          </Reveal>
        </div>
      </section>

      <section className="section" id="calculadora">
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
