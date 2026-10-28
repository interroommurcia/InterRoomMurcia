import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { PostHogProvider } from "../components/PostHogProvider";
import ChatWidget from "../components/ChatWidget";
import MobileNav from "../components/MobileNav";
import { SITE_URL } from "../lib/site";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "InterRoom Murcia — Habitaciones para estudiantes en Murcia y Cartagena",
    template: "%s | InterRoom Murcia",
  },
  description:
    "Habitaciones para estudiantes verificadas cerca de la UCAM, la UMU y la UPCT. Disponibilidad real, actualizada al minuto.",
  verification: {
    google: ["JdK4Tje4IR5mI8-CDMOYJfzlHRK19M2NnWyvWU2BDhE", "qGUypLyIprjg4UEDWQW1Uy0XPBv9bUSOi8GEXbIL1SA"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    title: "InterRoom",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "google-adsense-account": "ca-pub-6067028856246284",
  },
};

export const viewport = {
  themeColor: "#ea6a12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${SITE_URL}#business`,
  name: "InterRoom Murcia",
  url: SITE_URL,
  email: "interroommurcia@gmail.com",
  telephone: "+34613096518",
  image: `${SITE_URL}/icon.svg`,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Alquiler de habitaciones para estudiantes y gestión integral del alquiler en Murcia y Cartagena, cerca de la UCAM, la UMU y la UPCT. Inquilinos verificados, contrato, cobro y gestión de incidencias.",
  areaServed: [
    { "@type": "City", name: "Murcia" },
    { "@type": "City", name: "Cartagena" },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Murcia",
    addressRegion: "Región de Murcia",
    addressCountry: "ES",
  },
  knowsLanguage: ["es"],
  sameAs: ["https://wa.me/34613096518"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={montserrat.variable}>
        {/* Loader de AdSense como <script> literal para que aparezca en el HTML
            estático de todas las páginas (necesario para que el rastreador de
            AdSense verifique el dominio). NO muestra anuncios por sí solo: solo
            salen donde hay un <AdSlot> (artículos), salvo que actives Auto Ads. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6067028856246284"
          crossOrigin="anonymous"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }} />
        <PostHogProvider>
          <header>
            <nav>
              <a href="/" className="logo">
                Inter<span>Room</span> Murcia
              </a>
              <div className="navlinks">
                <a href="/catalogo">Catálogo</a>
                <a href="/inversores">Inversores</a>
                <a href="/venta">Vende tu Casa</a>
                <a href="/blog">Blog</a>
                <a href="/contacto">Contacto</a>
              </div>
              <a href="/catalogo" className="nav-cta">
                Ver habitaciones
              </a>
              <MobileNav />
            </nav>
          </header>
          {children}
          <footer className="site-footer">
            <div className="site-footer-overlay">
              <div className="wrap site-footer-grid">
                <div className="site-footer-brand">
                  <a href="/" className="logo">
                    Inter<span>Room</span> Murcia
                  </a>
                  <p>Alquiler de habitaciones, búsqueda de inquilinos y gestión del inmueble en Murcia y Cartagena.</p>
                </div>
                <div className="site-footer-links">
                  <span className="site-footer-heading">Navegación</span>
                  <a href="/catalogo">Catálogo</a>
                  <a href="/inversores">Inversores</a>
                  <a href="/venta">Vende tu Casa</a>
                  <a href="/blog">Blog</a>
                  <a href="/contacto">Contacto</a>
                </div>
                <div className="site-footer-links">
                  <span className="site-footer-heading">Contacto</span>
                  <a href="https://wa.me/34613096518" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                  <span>Murcia · Cartagena</span>
                </div>
              </div>
              <div className="wrap site-footer-bottom">
                <span>© {new Date().getFullYear()} InterRoom Murcia</span>
                <a href="/privacidad">Privacidad y cookies</a>
                <span>Habitaciones para estudiantes</span>
              </div>
            </div>
          </footer>
          <ChatWidget />
        </PostHogProvider>
      </body>
    </html>
  );
}
