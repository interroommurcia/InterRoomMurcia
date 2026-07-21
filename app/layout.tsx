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
          <footer>
            <div className="wrap foot-grid">
              <span>InterRoom Murcia — habitaciones para estudiantes</span>
              <span>Murcia · Cartagena</span>
            </div>
          </footer>
        </PostHogProvider>
      </body>
    </html>
  );
}
