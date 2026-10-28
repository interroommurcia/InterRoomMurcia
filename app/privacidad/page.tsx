import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad y cookies",
  description:
    "Cómo InterRoom Murcia trata tus datos y usa cookies, incluidas las de analítica y las de publicidad de Google AdSense.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 820, lineHeight: 1.7 }}>
        <h1>Política de privacidad y cookies</h1>
        <p style={{ color: "#6b7280" }}>Última actualización: 29 de octubre de 2026</p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de tus datos es <strong>InterRoom Murcia</strong>, con
          actividad de gestión y alquiler de habitaciones y viviendas en Murcia y Cartagena (España).
          Puedes contactar con nosotros en{" "}
          <a href="mailto:interroommurcia@gmail.com">interroommurcia@gmail.com</a> o en el teléfono
          +34&nbsp;613&nbsp;096&nbsp;518.
        </p>

        <h2>2. Qué datos recogemos</h2>
        <ul>
          <li>
            <strong>Datos que nos facilitas</strong> al rellenar los formularios de la web (por
            ejemplo, al interesarte por una habitación o pedir una valoración): nombre, teléfono y, si
            lo escribes, el mensaje que nos dejas.
          </li>
          <li>
            <strong>Datos de navegación</strong> recogidos de forma automática mediante cookies y
            tecnologías similares: páginas visitas, dispositivo, navegador, país aproximado (por IP) y
            cómo llegas e interactúas con la web.
          </li>
        </ul>

        <h2>3. Para qué usamos tus datos y base legal</h2>
        <ul>
          <li>
            <strong>Atender tu solicitud</strong> y contactar contigo sobre habitaciones, viviendas o
            la gestión de tu inmueble. Base legal: tu consentimiento y la aplicación de medidas
            precontractuales a petición tuya.
          </li>
          <li>
            <strong>Analítica</strong> para entender el uso de la web y mejorarla. Base legal: tu
            consentimiento y nuestro interés legítimo en medir y optimizar el sitio.
          </li>
          <li>
            <strong>Publicidad</strong> mostrada en el blog a través de Google AdSense. Base legal: tu
            consentimiento.
          </li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          Usamos cookies propias y de terceros. Las técnicas son necesarias para que la web funcione.
          Las de analítica y publicidad solo se activan con tu consentimiento y puedes gestionarlas o
          rechazarlas desde la configuración de tu navegador.
        </p>
        <ul>
          <li>
            <strong>Analítica (PostHog):</strong> medimos de forma agregada el uso de la web (visitas,
            páginas vistas, origen del tráfico). No usamos estos datos para identificarte
            personalmente.
          </li>
          <li>
            <strong>Publicidad (Google AdSense):</strong> Google y sus socios utilizan cookies para
            mostrar anuncios en nuestro sitio. Google, como proveedor externo, utiliza cookies
            —incluida la cookie DART— para publicar anuncios basados en tus visitas a este y otros
            sitios web. Puedes inhabilitar la publicidad personalizada en la{" "}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
              Configuración de anuncios de Google
            </a>
            , y gestionar las cookies de terceros en{" "}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
              aboutads.info
            </a>{" "}
            o{" "}
            <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer">
              youronlinechoices.eu
            </a>
            .
          </li>
        </ul>
        <p>
          Más información sobre cómo Google usa los datos:{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
          >
            policies.google.com/technologies/partner-sites
          </a>
          .
        </p>

        <h2>5. Destinatarios</h2>
        <p>
          No vendemos tus datos. Se tratan en los proveedores que nos prestan servicio (alojamiento
          web, analítica y publicidad), que actúan conforme a sus propias políticas y, cuando procede,
          con las garantías adecuadas para transferencias internacionales.
        </p>

        <h2>6. Conservación</h2>
        <p>
          Conservamos los datos de contacto el tiempo necesario para atender tu solicitud y la relación
          posterior, y los datos de navegación durante los plazos propios de las herramientas de
          analítica y publicidad. Después se eliminan o anonimizan.
        </p>

        <h2>7. Tus derechos</h2>
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
          portabilidad, así como retirar tu consentimiento en cualquier momento, escribiendo a{" "}
          <a href="mailto:interroommurcia@gmail.com">interroommurcia@gmail.com</a>. También puedes
          reclamar ante la Agencia Española de Protección de Datos (
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
            aepd.es
          </a>
          ) si consideras que no hemos atendido correctamente tu solicitud.
        </p>
      </div>
    </section>
  );
}
