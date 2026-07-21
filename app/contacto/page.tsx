import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import LeadForm from "./LeadForm";

export const metadata: Metadata = {
  title: "Propietarios",
  description:
    "Gestionamos el alquiler tradicional de tu vivienda en Murcia y Cartagena: inquilinos verificados, contrato, cobro e incidencias. Cobramos el 15% + IVA solo sobre el beneficio que genera tu casa.",
};

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

function KeysIcon() {
  return (
    <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="17" cy="17" r="9" stroke="currentColor" strokeWidth="2.4" />
      <path d="M23 23l16 16m0 0v-7m0 7h-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 5l16 6v11c0 10-7 17-16 21-9-4-16-11-16-21V11l16-6z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M17 24l5 5 10-10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="visual-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <path d="M6 19h36M15 6v8M33 6v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function ContactoPage() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Para propietarios · Murcia y Cartagena</div>
            <h1>
              Alquila tu piso
              <br />
              <em>sin liarte</em> con nada.
            </h1>
            <p className="hero-sub">
              Buscamos inquilino, firmamos el contrato, cobramos cada mes y resolvemos cualquier
              incidencia. Tu solo recibes el ingreso en tu cuenta.
            </p>
            <div className="hero-actions">
              <a href="#lead-form" className="btn-primary">
                Quiero mi valoracion gratuita
              </a>
              <a href="#como-funciona" className="btn-ghost">
                Como funciona
              </a>
            </div>
          </div>
          <div className="hero-side">
            <div>
              <div className="tag">Comision, no cuota fija</div>
              <div className="hero-side-title">15% + IVA</div>
              <p style={{ marginTop: 10, fontSize: "0.85rem", opacity: 0.9 }}>
                solo sobre el beneficio que genera tu vivienda
              </p>
            </div>
            <div className="hero-stats">
              <div>
                <b>0€</b>
                <span>coste si tu piso no genera ingreso</span>
              </div>
              <div>
                <b>24/7</b>
                <span>gestion de incidencias</span>
              </div>
              <div>
                <b>100%</b>
                <span>inquilinos verificados</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature" id="como-funciona">
        <div className="wrap feature-grid">
          <Reveal className="feature-text">
            <h2>El alquiler tradicional, sin los follones</h2>
            <p className="feature-lead">
              Gestionar un alquiler por tu cuenta significa muchas horas y bastante estres. Esto
              es lo que te quitamos de encima:
            </p>
            <CheckList
              items={[
                "Anuncios, visitas y filtrar inquilinos serios",
                "Contratos, fianzas y papeleo legal",
                "Cobro puntual del alquiler cada mes",
                "Impagos y gestiones de morosidad",
                "Averias y mantenimiento a cualquier hora",
                "Cambio de inquilino cada curso academico",
              ]}
            />
          </Reveal>
          <Reveal delay={120}>
            <div className="feature-visual tone-solid">
              <KeysIcon />
              <div className="visual-caption">Tu desconectas</div>
              <div className="visual-sub">Nosotros nos encargamos de todo el proceso</div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="feature">
        <div className="wrap feature-grid reverse">
          <Reveal>
            <div className="feature-visual tone-paper">
              <ShieldIcon />
              <div className="visual-caption">Gestion completa</div>
              <div className="visual-sub">Desde el primer anuncio hasta la ultima incidencia</div>
            </div>
          </Reveal>
          <Reveal className="feature-text" delay={120}>
            <h2>Que hacemos por tu vivienda</h2>
            <CheckList
              items={[
                "Seleccionamos y verificamos inquilinos estudiantes (documentacion, aval, historial)",
                "Redactamos y firmamos el contrato de alquiler",
                "Gestionamos el cobro mensual y el seguimiento de pagos",
                "Atendemos incidencias y mantenimiento",
                "Coordinamos la rotacion de inquilinos cada curso: UCAM, UMU, UPCT",
                "Te mandamos un reporte claro del estado de tu vivienda",
              ]}
            />
          </Reveal>
        </div>
      </section>

      <section className="feature">
        <div className="wrap feature-grid">
          <Reveal className="feature-text">
            <h2>Un modelo alineado contigo</h2>
            <p className="feature-lead">
              No cobramos una cuota fija todos los meses la generes o no. Cobramos el{" "}
              <b>15% + IVA</b> unicamente sobre el beneficio real que genera tu vivienda alquilada.
              Si tu piso no genera ingreso ese mes, nosotros tampoco cobramos.
            </p>
            <div className="price-example">
              Ejemplo: si tu vivienda genera <b>900€/mes</b> de beneficio, nuestra comision es{" "}
              <b>135€ + IVA</b>. El resto, <b>765€</b>, es para ti.
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="feature-visual tone-solid price-visual">
              <div className="price-big">15%</div>
              <div className="price-tag">+ IVA sobre el beneficio</div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="feature">
        <div className="wrap feature-grid reverse">
          <Reveal>
            <div className="feature-visual tone-paper">
              <CalendarIcon />
              <div className="visual-caption">Tranquilidad todo el año</div>
              <div className="visual-sub">Sin permanencia forzosa ni sorpresas</div>
            </div>
          </Reveal>
          <Reveal className="feature-text" delay={120}>
            <h2>Tranquilidad todo el año</h2>
            <CheckList
              items={[
                "Murcia tiene demanda constante de habitaciones por la UCAM, la UMU y la UPCT: menos meses vacios",
                "Sabes en todo momento el estado de tu vivienda, sin tener que preguntar",
                "Puedes volver a gestionar tu mismo cuando quieras: sin permanencia forzosa",
              ]}
            />
          </Reveal>
        </div>
      </section>

      <section className="section lead-section" id="lead-form">
        <div className="wrap">
          <Reveal>
            <div className="lead-card">
              <div>
                <h2>Pide tu valoracion gratuita</h2>
                <p>
                  Cuentanos donde esta tu vivienda y te decimos, sin compromiso, cuanto puede
                  generar gestionada por nosotros.
                </p>
              </div>
              <LeadForm />
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
