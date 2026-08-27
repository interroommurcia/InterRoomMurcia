import type { Metadata } from "next";
import Reveal from "../../components/Reveal";
import LeadForm from "./LeadForm";
import { WHATSAPP_NUMBER } from "../../lib/whatsapp";

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
      <path d="M10 22h24v10a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V22z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M34 25h4a4 4 0 0 1 0 8h-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8c0 3 3 3 3 6M24 8c0 3 3 3 3 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 44h30" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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
              <div className="visual-sub">Siente la incomodidad de estar tan tranquilo</div>
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
            <h2>Un Modelo Alineado Contigo</h2>
            <h2 className="feature-subtitle">Cuanto más Ganas Tú, más ganamos Nosotros</h2>
            <p className="feature-lead">
              No existe conflicto de intereses. No cobramos una cuota fija la generes o no. Cobramos el{" "}
              <b>15% + IVA</b> únicamente sobre el beneficio real que genera tu vivienda alquilada.
              Si tu piso no genera ingreso ese mes, nosotros tampoco cobramos. Así de simple.
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

      <section className="contacto-home">
        <div className="contacto-home-overlay" />
        <Reveal direction="scale" className="wrap contacto-home-inner">
          <h2>Contacta con nosotros</h2>
          <p>Escríbenos por WhatsApp o llámanos directamente.</p>
          <div className="contacto-home-actions">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <a href={`tel:+${WHATSAPP_NUMBER}`} className="btn-phone">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              +34 613 096 518
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
