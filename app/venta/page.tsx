import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import VentaForm from "./VentaForm";
import { WHATSAPP_NUMBER } from "../../lib/whatsapp";

export const metadata: Metadata = {
  title: "Vende tu casa en Murcia por solo 1,5% de comisión | Inmobiliaria digital",
  description:
    "Vende tu piso o casa en Murcia y Cartagena con InterRoom: inmobiliaria digital con comisión del 1,5% + IVA, la mitad que una agencia tradicional. Misma gestión, mitad de precio. Valoración gratuita.",
  keywords: [
    "vender piso Murcia",
    "inmobiliaria low cost Murcia",
    "inmobiliaria digital Murcia",
    "vender casa comisión baja",
    "inmobiliaria online Murcia",
    "inmobiliaria barata Murcia",
    "vender piso Cartagena",
    "comisión inmobiliaria 1,5%",
  ],
};

const PASOS = [
  {
    num: "01",
    titulo: "Valoración gratuita en 24h",
    desc: "Analizamos tu zona, comparables recientes y demanda real. Te damos un precio de mercado honesto, sin inflar para captar.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
        <path d="M20 10v10l7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "02",
    titulo: "Marketing profesional",
    desc: "Fotografía HD, tour virtual 360°, vídeo y publicación en los principales portales inmobiliarios y redes sociales.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect x="5" y="8" width="30" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="19" r="6" stroke="currentColor" strokeWidth="2" />
        <circle cx="29" cy="13" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    num: "03",
    titulo: "Filtrado y visitas",
    desc: "Solo compradores verificados y pre-cualificados financieramente. Nada de curiosos. Te informamos de cada visita.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="15" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M7 30c0-5 4-8 8-8s8 3 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="28" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M26 22c3 0 7 2 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 16l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  },
  {
    num: "04",
    titulo: "Negociación y escritura",
    desc: "Negociamos el mejor precio, gestionamos toda la documentación y te acompañamos hasta la firma en notaría.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M10 8h20v26H10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 16h10M15 20h10M15 24h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M25 30l4-4 2 2-4 4z" fill="currentColor" opacity="0.3" />
        <path d="M25 30l4-4 2 2-4 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const COMPARATIVA = [
  { concepto: "Comisión al vendedor", tradicional: "3% – 5% + IVA", interroom: "1,5% + IVA" },
  { concepto: "Fotografía profesional", tradicional: "A veces", interroom: "Siempre incluida" },
  { concepto: "Tour virtual 360°", tradicional: "Suplemento aparte", interroom: "Incluido" },
  { concepto: "Publicación en portales", tradicional: "Sí", interroom: "Sí + redes sociales" },
  { concepto: "Coste si no se vende", tradicional: "0 €", interroom: "0 €" },
  { concepto: "Permanencia", tradicional: "3-6 meses", interroom: "Sin permanencia" },
  { concepto: "Informes de visitas", tradicional: "Verbal", interroom: "Por escrito cada visita" },
  { concepto: "Acompañamiento notaría", tradicional: "Sí", interroom: "Sí" },
];

const FAQS = [
  {
    q: "¿Por qué cobráis solo 1,5%?",
    a: "Somos una inmobiliaria digital que opera en Murcia, Alicante y Almería con sede en Murcia. Usamos tecnología para automatizar procesos y reducir costes operativos. Ese ahorro te lo trasladamos a ti.",
  },
  {
    q: "¿Qué incluye el 1,5% + IVA?",
    a: "Todo: valoración, fotografía profesional, tour virtual, publicación en portales, filtrado de compradores, gestión de visitas, negociación y acompañamiento hasta la firma en notaría.",
  },
  {
    q: "¿Hay algún coste si no se vende?",
    a: "No. Solo cobramos si vendemos tu inmueble. Sin cuotas fijas, sin permanencia, sin costes ocultos.",
  },
  {
    q: "¿Cuánto tarda en venderse?",
    a: "Depende de la zona y el precio, pero con un precio de mercado correcto y nuestro marketing, la media está entre 35 y 45 días.",
  },
  {
    q: "¿Trabajáis en toda Murcia?",
    a: "Sí, en Murcia capital, pedanías, Cartagena y toda la Región de Murcia, además de Alicante y Almería.",
  },
];

export default function VentaPage() {
  return (
    <>
      {/* Hero — propuesta de valor directa */}
      <section className="venta-hero">
        <div className="wrap venta-hero-inner">
          <Reveal>
            <div className="venta-hero-content">
              <div className="eyebrow" style={{ color: "var(--orange)" }}>
                Inmobiliaria digital · Murcia y Cartagena
              </div>
              <h1>
                Vende tu casa por
                <br />
                <em>la mitad de comisión</em>
              </h1>
              <p className="venta-hero-claim">
                Inmobiliaria digital: misma gestión, mitad de comisión.
                <br />
                <strong>Solo 1,5% + IVA al vendedor</strong> — la mitad que una agencia tradicional.
                Sin costes inflados. Todo lo que ahorras, te lo quedas tú.
              </p>
              <div className="venta-hero-stats">
                <div className="venta-stat">
                  <span className="venta-stat-num">1,5%</span>
                  <span className="venta-stat-label">comisión + IVA</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">0€</span>
                  <span className="venta-stat-label">si no vendemos</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">24h</span>
                  <span className="venta-stat-label">valoración gratuita</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">0</span>
                  <span className="venta-stat-label">meses de permanencia</span>
                </div>
              </div>
              <div className="hero-actions">
                <a href="#lead-form" className="btn-primary">
                  Valoración gratuita
                </a>
                <a href="#comparativa" className="btn-ghost">
                  Compara comisiones
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Bloque de ahorro concreto */}
      <section className="venta-ahorro">
        <div className="wrap">
          <Reveal>
            <div className="venta-ahorro-card">
              <h2>¿Cuánto te ahorras?</h2>
              <p>
                En un piso de <strong>150.000 €</strong>, una inmobiliaria tradicional al 3% te cobra{" "}
                <strong>4.500 € + IVA</strong>. Con InterRoom pagas solo{" "}
                <strong>2.250 € + IVA</strong>.
              </p>
              <div className="venta-ahorro-highlight">
                Te ahorras <span>2.250 €</span> por el mismo servicio
              </div>
              <p className="venta-ahorro-sub">
                Y a mayor precio de venta, mayor es tu ahorro. En una vivienda de 250.000 €
                te ahorras <strong>3.750 €</strong>.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Por qué somos más baratos — sin perder calidad */}
      <section className="feature">
        <div className="wrap feature-grid">
          <Reveal>
            <div className="feature-visual tone-solid">
              <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <rect x="6" y="14" width="36" height="24" rx="3" stroke="currentColor" strokeWidth="2.4" />
                <path d="M6 20h36" stroke="currentColor" strokeWidth="2.4" />
                <circle cx="24" cy="32" r="4" stroke="currentColor" strokeWidth="2.4" />
                <path d="M18 8h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <div className="visual-caption">Tecnología que reduce costes</div>
              <div className="visual-sub">Menos gastos fijos, más ahorro para ti</div>
              <div className="hero-stats" style={{ marginTop: 20 }}>
                <div>
                  <b>100%</b>
                  <span>online</span>
                </div>
                <div>
                  <b>200+</b>
                  <span>compradores activos</span>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal className="feature-text" delay={120}>
            <h2>¿Por qué podemos cobrar la mitad?</h2>
            <ul className="check-list">
              <li>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                  <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span><strong>Inmobiliaria digital: misma gestión, mitad de comisión</strong> — Estructura ligera y eficiente. Menos gastos fijos = comisión más baja para ti.</span>
              </li>
              <li>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                  <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span><strong>Tecnología propia</strong> — Automatizamos procesos que otras agencias hacen a mano con tres empleados.</span>
              </li>
              <li>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                  <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span><strong>Equipo especializado</strong> — Menos gente, más experta. Sin comerciales puerta fría ni estructuras infladas.</span>
              </li>
              <li>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                  <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span><strong>Mismo resultado</strong> — Tu casa se vende igual de rápido y al mismo precio. Lo que baja es lo que nos pagas a nosotros.</span>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Comparativa de comisiones */}
      <section className="venta-comparativa" id="comparativa">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Compara antes de decidir</h2>
              <p>Mismo servicio, diferente comisión</p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="venta-tabla-wrap">
              <table className="venta-tabla">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Agencia tradicional</th>
                    <th className="venta-tabla-highlight">InterRoom</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map((row) => (
                    <tr key={row.concepto}>
                      <td>{row.concepto}</td>
                      <td>{row.tradicional}</td>
                      <td className="venta-tabla-highlight">{row.interroom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pasos — timeline vertical */}
      <section className="venta-pasos" id="como-funciona">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Cómo vendemos tu casa</h2>
              <p>Un proceso sencillo, profesional y sin sorpresas</p>
            </div>
          </Reveal>
          <div className="venta-pasos-grid">
            {PASOS.map((paso, i) => (
              <Reveal key={paso.num} delay={i * 100}>
                <div className="venta-paso">
                  <div className="venta-paso-icon">{paso.icon}</div>
                  <div className="venta-paso-num">{paso.num}</div>
                  <div className="venta-paso-body">
                    <h3>{paso.titulo}</h3>
                    <p>{paso.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs — Schema markup para LLMs y Google */}
      <section className="venta-faqs">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Preguntas frecuentes</h2>
              <p>Lo que nos preguntan los propietarios que quieren vender</p>
            </div>
          </Reveal>
          <div className="venta-faqs-list">
            {FAQS.map((faq, i) => (
              <Reveal key={i} delay={i * 80}>
                <details className="venta-faq">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((faq) => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.a,
                },
              })),
            }),
          }}
        />
      </section>

      {/* Formulario */}
      <section className="section lead-section" id="lead-form">
        <div className="wrap">
          <Reveal>
            <div className="lead-card">
              <div>
                <h2>Pide tu valoración gratuita</h2>
                <p>
                  Cuéntanos dónde está tu inmueble y te decimos, sin compromiso,
                  cuánto puede valer y cuánto te ahorras con nuestra comisión del 1,5%.
                </p>
              </div>
              <VentaForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contacto */}
      <section className="contacto-home">
        <div className="contacto-home-overlay" />
        <Reveal direction="scale" className="wrap contacto-home-inner">
          <h2>¿Quieres vender? Hablamos</h2>
          <p>Escríbenos por WhatsApp o llámanos. Sin compromiso, sin presión.</p>
          <div className="contacto-home-actions">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quiero vender mi casa y me interesa vuestra comisión del 1,5%.")}`}
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
