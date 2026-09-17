import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import VentaForm from "./VentaForm";
import { WHATSAPP_NUMBER } from "../../lib/whatsapp";

export const metadata: Metadata = {
  title: "Vende tu inmueble",
  description:
    "Vende tu piso, casa o local en Murcia y Cartagena con InterRoom. Valoracion gratuita, marketing profesional y acompañamiento hasta la firma.",
};

const PASOS = [
  {
    num: "01",
    titulo: "Valoracion gratuita",
    desc: "Analizamos el mercado y te damos un precio real de venta en 48 horas.",
  },
  {
    num: "02",
    titulo: "Marketing profesional",
    desc: "Fotografia profesional, tour virtual y publicacion en los principales portales.",
  },
  {
    num: "03",
    titulo: "Gestion de visitas",
    desc: "Filtramos compradores serios, organizamos visitas y te informamos de cada una.",
  },
  {
    num: "04",
    titulo: "Notaria y cierre",
    desc: "Negociamos el mejor precio y te acompañamos hasta la firma en notaria.",
  },
];

const VENTAJAS = [
  {
    dato: "10+",
    subtitulo: "años en la zona",
    titulo: "Conocemos tu zona",
    desc: "Expertos en el mercado de Murcia y Cartagena. Sabemos lo que vale tu inmueble porque llevamos años operando aqui.",
  },
  {
    dato: "200+",
    subtitulo: "compradores activos",
    titulo: "Red de compradores",
    desc: "Inversores y compradores verificados buscando oportunidades ahora mismo. Tu inmueble llega a quien realmente compra.",
  },
  {
    dato: "100%",
    subtitulo: "transparencia",
    titulo: "Sin sorpresas",
    desc: "Sabes el estado de tu venta en todo momento. Informes de visitas, feedback de compradores y seguimiento continuo.",
  },
  {
    dato: "0€",
    subtitulo: "hasta la venta",
    titulo: "Sin riesgo para ti",
    desc: "Solo cobramos cuando tu inmueble se vende. Sin cuotas fijas, sin permanencia, sin costes ocultos.",
  },
];

export default function VentaPage() {
  return (
    <>
      {/* Hero oscuro — diferente al resto de páginas */}
      <section className="venta-hero">
        <div className="wrap venta-hero-inner">
          <Reveal>
            <div className="venta-hero-content">
              <div className="eyebrow" style={{ color: "var(--orange)" }}>
                Compraventa · Murcia y Cartagena
              </div>
              <h1>
                Vende tu inmueble
                <br />
                <em>al mejor precio</em>
              </h1>
              <p>
                Nos encargamos de todo: valoracion, marketing, visitas, negociacion
                y escritura. Tu solo decides cuando aceptar la oferta.
              </p>
              <div className="venta-hero-stats">
                <div className="venta-stat">
                  <span className="venta-stat-num">0€</span>
                  <span className="venta-stat-label">hasta la venta</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">48h</span>
                  <span className="venta-stat-label">primera valoracion</span>
                </div>
                <div className="venta-stat">
                  <span className="venta-stat-num">100%</span>
                  <span className="venta-stat-label">transparencia</span>
                </div>
              </div>
              <div className="hero-actions">
                <a href="#lead-form" className="btn-primary">
                  Valoracion gratuita
                </a>
                <a href="#como-funciona" className="btn-ghost" style={{ borderColor: "rgba(255,255,255,.3)", color: "#fff" }}>
                  Como funciona
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pasos — timeline vertical */}
      <section className="venta-pasos" id="como-funciona">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Como vendemos tu inmueble</h2>
              <p>Un proceso sencillo, profesional y sin sorpresas</p>
            </div>
          </Reveal>
          <div className="venta-pasos-grid">
            {PASOS.map((paso, i) => (
              <Reveal key={paso.num} delay={i * 100}>
                <div className="venta-paso">
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

      {/* Ventajas — feature con visual + checklist */}
      <section className="feature">
        <div className="wrap feature-grid">
          <Reveal>
            <div className="feature-visual tone-solid">
              <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M24 4l-2 6h-6l5 4-2 6 5-4 5 4-2-6 5-4h-6z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                <rect x="8" y="22" width="32" height="20" rx="3" stroke="currentColor" strokeWidth="2.4" />
                <path d="M8 28h32" stroke="currentColor" strokeWidth="2.4" />
                <path d="M16 34h6M16 38h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <div className="visual-caption">Tu inmueble, nuestra prioridad</div>
              <div className="visual-sub">Experiencia local + alcance profesional</div>
              <div className="hero-stats" style={{ marginTop: 20 }}>
                <div>
                  <b>10+</b>
                  <span>años en la zona</span>
                </div>
                <div>
                  <b>200+</b>
                  <span>compradores activos</span>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal className="feature-text" delay={120}>
            <h2>Por que vender con InterRoom</h2>
            <ul className="check-list">
              {VENTAJAS.map((v) => (
                <li key={v.titulo}>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="10" fill="var(--orange)" />
                    <path d="M6 10.4l2.4 2.4L14 7.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span><strong>{v.titulo}</strong> — {v.desc}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Formulario */}
      <section className="section lead-section" id="lead-form">
        <div className="wrap">
          <Reveal>
            <div className="lead-card">
              <div>
                <h2>Pide tu valoracion gratuita</h2>
                <p>
                  Cuentanos donde esta tu inmueble y te decimos, sin compromiso,
                  cuanto puede valer en el mercado actual.
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
