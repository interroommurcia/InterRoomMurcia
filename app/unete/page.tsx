import type { Metadata } from "next";
import UneteForm from "../../components/UneteForm";

export const metadata: Metadata = {
  title: "Apúntate a la lista — avisos de habitaciones en Murcia",
  description:
    "Déjanos tu contacto y te avisamos en cuanto quede una habitación libre en Murcia o Cartagena. Estudiantes y propietarios.",
  alternates: { canonical: "/unete" },
};

export default function UnetePage() {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px" }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 38px)", lineHeight: 1.15, margin: "0 0 12px" }}>
          Apúntate y te avisamos cuando haya hueco
        </h1>
        <p style={{ fontSize: 17, color: "#4b5563", margin: "0 0 28px", maxWidth: 560 }}>
          Las habitaciones cerca de la UCAM, la UMU y la UPCT vuelan. Déjanos tu contacto y te avisamos
          <b> en cuanto quede una libre</b> — sin que tengas que estar mirando la web.
        </p>
        <UneteForm origen="pagina-unete" />
      </div>
    </section>
  );
}
