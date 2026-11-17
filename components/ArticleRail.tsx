import Link from "next/link";
import { recursosParaArticulo, RECURSOS } from "../lib/afiliados";
import AdSlot from "./AdSlot";

const ADSENSE_SLOT_RAIL = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RAIL;

// Raíl lateral de la plantilla "con-anuncios": bloques fijos (sticky) en el
// borde del artículo para captar leads de la luz (enlace interno a nuestro
// comparador) y monetizar con afiliados (Amazon, seguros, fibra…). Los enlaces
// afiliados solo aparecen cuando tienen `url` real en lib/afiliados.ts.
// Los clics se registran solos: ArticleLinkTracker escucha en .article-layout.
// `demo`: en la previsualización del panel muestra los productos aunque todavía
// no tengan enlace de afiliado, para poder ver cómo quedará la plantilla.
export default function ArticleRail({ texto, demo = false }: { texto: string; demo?: boolean }) {
  // Afiliados activos (con url) que encajen con el tema, sin la luz (va fija arriba).
  const afiliados = demo
    ? RECURSOS.filter((r) => r.tipo === "afiliado" && !r.temas).slice(0, 4)
    : recursosParaArticulo(texto, 4).filter((r) => r.tipo === "afiliado" && r.id !== "comparador-luz");

  return (
    <aside className="article-rail" aria-label="Recomendados">
      {/* Lead de la luz: siempre visible, es nuestro y 100% monetizable ya. */}
      <Link href="/comparador-luz" className="rail-lead">
        <span className="rail-lead-badge">Ahorro</span>
        <strong>¿Te mudas? Baja tu factura de la luz</strong>
        <span className="rail-lead-text">
          Compara tu tarifa eléctrica en 2 minutos y ahorra desde el primer mes.
        </span>
        <span className="rail-lead-cta">Comparar tarifas →</span>
      </Link>

      {afiliados.length > 0 && (
        <div className="rail-afiliados">
          <span className="rail-afiliados-titulo">Recomendado</span>
          {afiliados.map((r) => {
            const inner = (
              <>
                <span className="rail-card-top">
                  {r.titulo}
                  <span className="rail-card-ad">AD</span>
                </span>
                <span className="rail-card-desc">{r.descripcion}</span>
                <span className="rail-card-cta">{r.cta} →</span>
              </>
            );
            return demo ? (
              <span key={r.id} className="rail-card" aria-disabled="true">
                {inner}
              </span>
            ) : (
              <a key={r.id} href={r.url ?? "#"} target="_blank" rel="sponsored nofollow noopener noreferrer" className="rail-card">
                {inner}
              </a>
            );
          })}
          <p className="rail-disclosure">
            Enlaces de afiliado: podemos recibir una comisión sin coste extra para ti.
          </p>
        </div>
      )}

      {/* Hueco para un anuncio vertical de AdSense cuando la cuenta esté aprobada
          y exista NEXT_PUBLIC_ADSENSE_SLOT_RAIL. Si no, no pinta nada. */}
      <AdSlot slot={ADSENSE_SLOT_RAIL} />
    </aside>
  );
}
