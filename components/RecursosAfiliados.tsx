import Link from "next/link";
import type { Recurso } from "../lib/afiliados";

// Bloque "Recursos recomendados" para el final de un artículo. Internos como
// enlaces normales; afiliados abren en pestaña nueva con rel sponsored y una
// nota de transparencia (exigible por la normativa de publicidad).
export default function RecursosAfiliados({ recursos }: { recursos: Recurso[] }) {
  if (!recursos.length) return null;
  const hayAfiliado = recursos.some((r) => r.tipo === "afiliado");

  return (
    <div className="article-recursos" style={{ marginTop: 40, padding: 20, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fafafa" }}>
      <h2 style={{ marginTop: 0 }}>Recursos recomendados</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {recursos.map((r) => {
          const esAfiliado = r.tipo === "afiliado";
          const contenido = (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>
                {r.titulo}
                {esAfiliado && <span style={{ marginLeft: 6, fontSize: 10, color: "#9ca3af", fontWeight: 600, verticalAlign: "middle" }}>AD</span>}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>{r.descripcion}</div>
              <span style={{ display: "inline-block", padding: "7px 12px", borderRadius: 8, background: "var(--orange)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                {r.cta} →
              </span>
            </>
          );
          const cardStyle: React.CSSProperties = { display: "block", padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, textDecoration: "none" };

          return esAfiliado ? (
            <a key={r.id} href={r.url ?? "#"} target="_blank" rel="sponsored nofollow noopener noreferrer" style={cardStyle}>
              {contenido}
            </a>
          ) : (
            <Link key={r.id} href={r.url ?? "#"} style={cardStyle}>
              {contenido}
            </Link>
          );
        })}
      </div>
      {hayAfiliado && (
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, marginBottom: 0 }}>
          Algunos enlaces son de afiliado: si contratas a través de ellos, InterRoom Murcia puede recibir una comisión sin coste extra para ti.
        </p>
      )}
    </div>
  );
}
