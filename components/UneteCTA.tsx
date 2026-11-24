import UneteForm from "./UneteForm";

type Props = {
  origen: string;
  titulo?: string;
  subtitulo?: string;
  /** "form" muestra el formulario inline; "boton" un enlace compacto a /unete. */
  modo?: "form" | "boton";
};

export default function UneteCTA({
  origen,
  titulo = "¿Buscas habitación en Murcia?",
  subtitulo = "Apúntate y te avisamos en cuanto quede una libre cerca de tu universidad.",
  modo = "form",
}: Props) {
  return (
    <div
      className="unete-cta"
      style={{
        border: "1px solid rgba(234,106,18,0.25)",
        background: "rgba(234,106,18,0.05)",
        borderRadius: 16,
        padding: modo === "boton" ? "18px 18px" : "22px 22px",
        margin: "28px 0",
      }}
    >
      <h3 style={{ margin: "0 0 6px", fontSize: 19, lineHeight: 1.2 }}>{titulo}</h3>
      <p style={{ margin: "0 0 16px", color: "#4b5563", fontSize: 14.5, lineHeight: 1.5 }}>{subtitulo}</p>
      {modo === "boton" ? (
        <a
          href="/unete"
          className="btn-primary"
          style={{ display: "inline-block", textAlign: "center", width: "100%", padding: "12px 16px", borderRadius: 10, fontWeight: 700 }}
        >
          Avísame de nuevas habitaciones
        </a>
      ) : (
        <UneteForm origen={origen} />
      )}
    </div>
  );
}
