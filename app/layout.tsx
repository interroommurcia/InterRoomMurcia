import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { PostHogProvider } from "../components/PostHogProvider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://interroommurcia.com"),
  title: {
    default: "InterRoom Murcia — Habitaciones para estudiantes en Murcia y Cartagena",
    template: "%s | InterRoom Murcia",
  },
  description:
    "Habitaciones para estudiantes verificadas cerca de la UCAM, la UMU y la UPCT. Disponibilidad real, actualizada al minuto.",
  verification: {
    google: "JdK4Tje4IR5mI8-CDMOYJfzlHRK19M2NnWyvWU2BDhE",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={montserrat.variable}>
        <PostHogProvider>
          <header>
            <nav>
              <a href="/" className="logo">
                Inter<span>Room</span> Murcia
              </a>
              <div className="navlinks">
                <a href="/#zonas">Zonas</a>
                <a href="/#catalogo">Catálogo</a>
                <a href="/blog">Blog</a>
                <a href="/contacto">Contacto</a>
              </div>
              <a href="/#catalogo" className="nav-cta">
                Ver habitaciones
              </a>
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
                  <a href="/#zonas">Zonas</a>
                  <a href="/#catalogo">Catálogo</a>
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
                <span>Habitaciones para estudiantes</span>
              </div>
            </div>
          </footer>
        </PostHogProvider>
      </body>
    </html>
  );
}
