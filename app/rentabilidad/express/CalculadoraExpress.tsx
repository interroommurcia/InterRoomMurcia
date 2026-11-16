"use client";

import { useMemo, useState } from "react";
import styles from "../rentabilidad.module.css";

const PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar el script"));
    document.head.appendChild(s);
  });
}

const IVA = 1.21;
const COM = 0.15;

type Vals = Record<"N" | "Rh" | "Cl" | "Gf" | "Mh" | "Vp", string>;
const empty: Vals = { N: "", Rh: "", Cl: "", Gf: "", Mh: "", Vp: "" };
const placeholders: Vals = { N: "4", Rh: "320", Cl: "80", Gf: "150", Mh: "11", Vp: "150000" };

const fmt = (n: number) => (isFinite(n) ? `${Math.round(n).toLocaleString("es-ES")} €` : "—");
const pct = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
const num = (s: string) => {
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

export default function CalculadoraExpress() {
  const [v, setV] = useState(empty);
  const [limpieza, setLimpieza] = useState(true);
  const [suministros, setSuministros] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const set = (k: keyof Vals) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, "").replace(/^0+(?=\d)/, "");
    setV((prev) => ({ ...prev, [k]: raw }));
  };

  const c = useMemo(() => {
    const N = Math.max(1, num(v.N));
    const Rh = num(v.Rh);
    const Cl = limpieza ? num(v.Cl) : 0;
    const Gf = suministros ? num(v.Gf) : 0;
    const Mh = Math.min(12, Math.max(1, num(v.Mh) || 12));
    const Vp = num(v.Vp);

    const bruto = N * Rh;
    const com = bruto * COM * IVA;
    const neto = bruto - com - Cl - Gf;
    const anual = neto * Mh;
    const brutoAnual = bruto * Mh;
    const rentBruta = Vp > 0 ? (brutoAnual / Vp) * 100 : null;
    const rentNeta = Vp > 0 ? (anual / Vp) * 100 : null;

    return { N, Rh, Cl, Gf, Mh, bruto, com, neto, anual, brutoAnual, rentBruta, rentNeta };
  }, [v, limpieza, suministros]);

  const descargarPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await loadScript(PDF_CDN);
      const el = document.getElementById("pdf-root");
      if (!el || !window.html2pdf) throw new Error("PDF no disponible");
      await window
        .html2pdf()
        .from(el)
        .set({
          margin: [10, 10, 10, 10],
          filename: "informe-rentabilidad-interroom.pdf",
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .save();
    } catch (err) {
      alert("No se pudo generar el PDF. Prueba desde Chrome o Safari.");
      console.error(err);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <main className={styles.main}>
      <div id="pdf-root">
        <div className={styles.title}>
          <h1>
            Tu informe de <em>rentabilidad</em>.
          </h1>
          <p>
            Elige el precio por habitación y qué servicios incluyes. Comisión InterRoom: <b>15% + IVA</b>.
          </p>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>Tus datos</h2>
            <div className={styles.headActions}>
              <button type="button" className={styles.reset} onClick={() => setV(empty)}>
                Restablecer
              </button>
              <button type="button" className={styles.pdfBtn} onClick={descargarPdf} disabled={pdfBusy}>
                {pdfBusy ? (
                  <>
                    <span className={styles.spinner} aria-hidden /> Generando PDF
                  </>
                ) : (
                  "Descargar PDF"
                )}
              </button>
            </div>
          </div>
          <div className={styles.grid}>
            <Field label="Nº habitaciones">
              <input type="text" inputMode="numeric" value={v.N} placeholder={placeholders.N} onChange={set("N")} />
            </Field>
            <Field label="Precio por habitación" unit="€/mes">
              <input type="text" inputMode="numeric" value={v.Rh} placeholder={placeholders.Rh} onChange={set("Rh")} />
            </Field>
            <Field label="Meses alquilados" unit="meses/año">
              <input type="text" inputMode="numeric" value={v.Mh} placeholder={placeholders.Mh} onChange={set("Mh")} />
            </Field>
            <Field label="Servicio de limpieza">
              <select value={limpieza ? "si" : "no"} onChange={(e) => setLimpieza(e.target.value === "si")}>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </Field>
            {limpieza ? (
              <Field label="Coste limpieza" unit="€/mes">
                <input type="text" inputMode="numeric" value={v.Cl} placeholder={placeholders.Cl} onChange={set("Cl")} />
              </Field>
            ) : null}
            <Field label="Suministros incluidos">
              <select value={suministros ? "si" : "no"} onChange={(e) => setSuministros(e.target.value === "si")}>
                <option value="si">Sí</option>
                <option value="no">No (los paga el inquilino)</option>
              </select>
            </Field>
            {suministros ? (
              <Field label="Coste suministros + wifi" unit="€/mes">
                <input type="text" inputMode="numeric" value={v.Gf} placeholder={placeholders.Gf} onChange={set("Gf")} />
              </Field>
            ) : null}
            <Field label="Valor del piso (opcional)" unit="€">
              <input type="text" inputMode="numeric" value={v.Vp} placeholder={placeholders.Vp} onChange={set("Vp")} />
            </Field>
          </div>
        </section>

        <section className={styles.scenarios} style={{ gridTemplateColumns: "1fr" }}>
          <article className={`${styles.card} ${styles.b}`}>
            <header className={styles.cardHead}>
              <div>
                <h3>Rentabilidad estimada</h3>
                <div className={styles.sub}>
                  {c.N} habitaciones · {limpieza ? "con limpieza" : "sin limpieza"} ·{" "}
                  {suministros ? "suministros incluidos" : "suministros aparte"}
                </div>
              </div>
              <span className={styles.chip}>15% + IVA</span>
            </header>
            <div className={styles.bigMetric}>
              <div className={styles.k}>Neto propietario</div>
              <div className={styles.v}>
                {Math.round(c.neto).toLocaleString("es-ES")}
                <span className={styles.per}>€/mes</span>
              </div>
              <div className={styles.yr}>
                Anual ({c.Mh} meses): <b>{fmt(c.anual)}</b>
              </div>
            </div>
            <div className={styles.rows}>
              <Row l={<>Ingreso bruto <small>({c.N} × {fmt(c.Rh)})</small></>} r={`${fmt(c.bruto)}/mes`} />
              <Row l="Comisión InterRoom (15% + IVA)" r={`−${fmt(c.com)}`} neg />
              {limpieza ? <Row l="Limpieza" r={`−${fmt(c.Cl)}`} neg /> : null}
              {suministros ? <Row l="Suministros + wifi" r={`−${fmt(c.Gf)}`} neg /> : null}
              <Row l="Neto mensual" r={fmt(c.neto)} total />
              {c.rentBruta !== null ? <Row l="Rentabilidad bruta anual" r={pct(c.rentBruta)} /> : null}
              {c.rentNeta !== null ? <Row l="Rentabilidad neta anual" r={pct(c.rentNeta)} total /> : null}
            </div>
          </article>
        </section>

        <div className={styles.cap} style={{ marginTop: 12 }}>
          Estimación orientativa con los datos introducidos. No incluye impuestos, IBI, comunidad ni seguros.
        </div>

        <section className={styles.cta}>
          <div className={styles.ctaL}>
            ¿Hablamos de <b>tu piso concreto</b>? Valoración gratis en 48 h.
          </div>
          <a
            href="https://wa.me/34613096518?text=Hola%2C%20he%20visto%20el%20informe%20de%20rentabilidad%20y%20quiero%20una%20valoraci%C3%B3n%20de%20mi%20piso."
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp 613 096 518
          </a>
        </section>

        <div className={styles.foot}>
          <b>InterRoom Murcia</b> · interroommurcia@gmail.com · interroommurcia.com
        </div>
      </div>
    </main>
  );
}

function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <div className={styles.inputWrap}>
        {children}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </div>
    </div>
  );
}

function Row({ l, r, neg, total }: { l: React.ReactNode; r: React.ReactNode; neg?: boolean; total?: boolean }) {
  return (
    <div className={`${styles.row} ${total ? styles.rowTotal : ""}`}>
      <span className={styles.rowL}>{l}</span>
      <span className={`${styles.rowR} ${neg ? styles.neg : ""}`}>{r}</span>
    </div>
  );
}
