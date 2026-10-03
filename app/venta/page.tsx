import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import VentaForm from "./VentaForm";
import SavingsCalculator from "./SavingsCalculator";
import StickyCTA from "./StickyCTA";
import ExitIntent from "./ExitIntent";
import VentaHeader from "./VentaHeader";
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
    titulo: "Valoración en 24h",
    desc: "Analizamos comparables recientes y demanda real. Te damos un precio de mercado honesto.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
        <path d="M20 10v10l7 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "02",
    titulo: "Fotos, vídeo y tour 360°",
    desc: "Fotografía profesional HD, tour virtual y publicación en todos los portales + redes sociales.",
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
    titulo: "Solo compradores reales",
    desc: "Verificados y pre-cualificados financieramente. Nada de curiosos. Te informamos de cada visita.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="15" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M7 30c0-5 4-8 8-8s8 3 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="28" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M26 22c3 0 7 2 7 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "04",
    titulo: "Hasta la firma en notaría",
    desc: "Negociamos el mejor precio, gestionamos documentación y te acompañamos hasta escritura.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M10 8h20v26H10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M15 16h10M15 20h10M15 24h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

const TESTIMONIOS = [
  {
    nombre: "María G.",
    zona: "Murcia centro",
    texto: "Vendimos nuestro piso en 32 días y nos ahorramos más de 2.000 €. Todo el proceso fue muy transparente y profesional.",
    resultado: "Vendido en 32 días",
  },
  {
    nombre: "Carlos R.",
    zona: "Cartagena",
    texto: "Tenía dudas por la comisión tan baja, pero el servicio fue igual o mejor que la agencia tradicional que usé antes. Recomendado al 100%.",
    resultado: "Ahorró 3.200 €",
  },
  {
    nombre: "Laura y Javi",
    zona: "Molina de Segura",
    texto: "Nos encantó la transparencia: informes por escrito después de cada visita y negociaron un precio mejor del que esperábamos.",
    resultado: "Vendido por encima del precio",
  },
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

const INCLUIDO = [
  {
    titulo: "Fotografía profesional HD",
    desc: "Fotos que venden, no fotos de móvil",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="3" y="7" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    titulo: "Tour virtual 360°",
    desc: "El comprador visita desde su sofá",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.8" />
        <ellipse cx="16" cy="16" rx="6" ry="12" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 16h24" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    titulo: "Publicación en portales",
    desc: "Idealista, Fotocasa, Milanuncios y más",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="5" y="4" width="22" height="24" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 10h12M10 15h8M10 20h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    titulo: "Filtrado de compradores",
    desc: "Solo visitas de personas reales y solventes",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 26c0-4 3-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M21 14l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    titulo: "Negociación experta",
    desc: "Conseguimos el mejor precio posible",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M6 24V12l10-6 10 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M13 24v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    titulo: "Hasta la notaría",
    desc: "Documentación y firma sin preocuparte",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M8 6h16v20H8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 12h8M12 16h8M12 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function VentaPage() {
  return (
    <>
      <VentaHeader />

      {/* ─── HERO — impacto visual + propuesta clara ─── */}
      <section className="venta-hero">
        <div className="venta-hero-bg" />
        <div className="wrap venta-hero-inner">
          <Reveal>
            <div className="venta-hero-content">
              <div className="venta-hero-badge">
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
                  <path d="M8 1l2 4.5L15 6l-3.5 3.5L12.5 15 8 12.5 3.5 15l1-5.5L1 6l5-0.5z" fill="currentColor" />
                </svg>
                Tiempo medio de venta: 35-45 días
              </div>
              <h1>
                Vende tu casa.
                <br />
                <em>Paga la mitad.</em>
              </h1>
              <p className="venta-hero-claim">
                Solo <strong>1,5% + IVA</strong> de comisión al vendedor.
                La mitad que una agencia tradicional, con el mismo servicio completo.
                Si no vendemos, no pagas nada.
              </p>
              <div className="venta-hero-stats">
                <div className="venta-stat venta-stat--hero">
                  <span className="venta-stat-num">1,5%</span>
                  <span className="venta-stat-label">comisión + IVA</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">0€</span>
                  <span className="venta-stat-label">si no vendemos</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">0</span>
                  <span className="venta-stat-label">meses permanencia</span>
                </div>
              </div>
              <div className="hero-actions">
                <a href="#lead-form" className="btn-primary">
                  Descubre cuánto vale tu casa
                </a>
                <a href="#calculadora" className="btn-ghost">
                  ¿Cuánto te cobra tu agencia?
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── CALCULADORA INTERACTIVA ─── */}
      <section className="venta-calc-section" id="calculadora">
        <div className="wrap">
          <Reveal>
            <SavingsCalculator />
          </Reveal>
        </div>
      </section>

      {/* ─── PRUEBA SOCIAL — testimonios reales ─── */}
      <section className="venta-social">
        <div className="wrap">
          <Reveal>
            <div className="venta-social-header">
              <div className="venta-social-badges">
                <div className="venta-badge">
                  <svg viewBox="0 0 20 20" fill="var(--orange)" width="18" height="18" aria-hidden="true">
                    <path d="M10 1l2.5 5.5L18 7l-4 4 1 5.5L10 14l-5 2.5 1-5.5L2 7l5.5-.5z" />
                  </svg>
                  <span><strong>4.9</strong> en Google</span>
                </div>
                <div className="venta-badge">
                  <span>Publicamos en</span>
                  <strong>Idealista · Fotocasa · Milanuncios</strong>
                </div>
              </div>
            </div>
          </Reveal>
          <div className="venta-testimonios">
            {TESTIMONIOS.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="venta-testimonio">
                  <div className="venta-testimonio-resultado">{t.resultado}</div>
                  <p>&ldquo;{t.texto}&rdquo;</p>
                  <div className="venta-testimonio-autor">
                    <div className="venta-testimonio-avatar">
                      {t.nombre.charAt(0)}
                    </div>
                    <div>
                      <strong>{t.nombre}</strong>
                      <span>{t.zona}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUÉ INCLUYE — visual, no defensivo ─── */}
      <section className="venta-incluido">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Todo esto está incluido en el 1,5%</h2>
              <p>El mismo servicio que una agencia al 3%, por la mitad</p>
            </div>
          </Reveal>
          <div className="venta-incluido-grid">
            {INCLUIDO.map((item, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="venta-incluido-item">
                  <div className="venta-incluido-icon">{item.icon}</div>
                  <div>
                    <h3>{item.titulo}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARATIVA ─── */}
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

      {/* ─── PASOS ─── */}
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

      {/* ─── FORMULARIO ─── */}
      <section className="section lead-section" id="lead-form">
        <div className="wrap">
          <Reveal>
            <div className="lead-card">
              <div>
                <h2>Descubre cuánto vale tu casa</h2>
                <p>
                  Cuéntanos dónde está tu inmueble y te damos, sin compromiso,
                  una valoración real y cuánto te ahorras con nuestra comisión del 1,5%.
                </p>
                <div className="lead-card-trust">
                  <div className="lead-card-trust-item">
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
                      <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                      <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Respuesta en 24h</span>
                  </div>
                  <div className="lead-card-trust-item">
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
                      <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                      <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Sin compromiso</span>
                  </div>
                  <div className="lead-card-trust-item">
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
                      <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                      <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>100% gratuita</span>
                  </div>
                </div>
              </div>
              <VentaForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── CONTACTO ─── */}
      <section className="contacto-home">
        <div className="contacto-home-overlay" />
        <Reveal direction="scale" className="wrap contacto-home-inner">
          <h2>¿Listo para vender? Hablamos</h2>
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

      {/* ─── Sticky CTA + Exit Intent ─── */}
      <StickyCTA />
      <ExitIntent />
    </>
  );
}
