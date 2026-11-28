"use client";

import { useMemo, useState } from "react";
import styles from "../rentabilidad.module.css";
import { calcularRentabilidad, fmtEuro, fmtPct } from "../../../lib/rentabilidad/calculo";

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


type Vals = Record<"N" | "Rh" | "Cl" | "Gf" | "Mh" | "Vp", string>;
const empty: Vals = { N: "", Rh: "", Cl: "", Gf: "", Mh: "", Vp: "" };
const placeholders: Vals = { N: "4", Rh: "320", Cl: "80", Gf: "150", Mh: "11", Vp: "150000" };

const fmt = fmtEuro;
const pct = fmtPct;
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

  const c = useMemo(
    () =>
      calcularRentabilidad({
        habitaciones: num(v.N),
        precioHabitacion: num(v.Rh),
        meses: num(v.Mh),
        limpieza: limpieza ? num(v.Cl) : null,
        suministros: suministros ? num(v.Gf) : null,
        valorPiso: num(v.Vp),
      }),
    [v, limpieza, suministros]
  );

  const descargarPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await loadScript(PDF_CDN);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const el = document.getElementById("pdf-report");
      if (!el || !window.html2pdf) throw new Error("PDF no disponible");
      await window
        .html2pdf()
        .from(el)
        .set({
          margin: 0,
          filename: "informe-rentabilidad-interroom.pdf",
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0 },
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

        <section className={styles.ctaVenta}>
          <div className={styles.ctaL}>
            Vendemos tu casa por solo el <b>1,5% de comisión</b> — ¡Llámanos!
          </div>
          <a href="tel:+34613096518">Llamar 613 096 518</a>
        </section>

        <div className={styles.foot}>
          <b>InterRoom Murcia</b> · interroommurcia@gmail.com · interroommurcia.com
        </div>
      </div>

      {pdfBusy ? (
        <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
          <div id="pdf-report" className={styles.rep}>
            <header className={styles.repHead}>
              <div>
                <div className={styles.repLogo}>
                  Inter<span>Room</span> Murcia
                </div>
                <div className={styles.repTag}>Gestión inmobiliaria integral en Murcia y Cartagena</div>
              </div>
              <div className={styles.repHeadR}>
                <div className={styles.repDoc}>Informe de rentabilidad</div>
                <div className={styles.repDate}>{new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</div>
              </div>
            </header>

            <div className={styles.repBody}>
              <h1 className={styles.repTitle}>
                Lo que te deja tu piso alquilado <em>por habitaciones</em>.
              </h1>

              <div className={styles.repData}>
                <DataItem k="Habitaciones" v={String(c.N)} />
                <DataItem k="Precio por habitación" v={`${fmt(c.Rh)}/mes`} />
                <DataItem k="Meses alquilados" v={`${c.Mh} al año`} />
                <DataItem k="Limpieza" v={limpieza ? `${fmt(c.Cl)}/mes` : "No incluida"} />
                <DataItem k="Suministros + wifi" v={suministros ? `${fmt(c.Gf)}/mes` : "Los paga el inquilino"} />
                {c.Vp > 0 ? <DataItem k="Valor del piso" v={fmt(c.Vp)} /> : null}
              </div>

              <div className={styles.repHero}>
                <div>
                  <div className={styles.repHeroK}>Neto para ti cada mes</div>
                  <div className={styles.repHeroV}>{fmt(c.neto)}</div>
                </div>
                <div className={styles.repHeroSide}>
                  <div className={styles.repHeroK}>Neto anual ({c.Mh} meses)</div>
                  <div className={styles.repHeroV2}>{fmt(c.anual)}</div>
                  {c.rentNeta !== null ? (
                    <div className={styles.repHeroPct}>Rentabilidad neta {pct(c.rentNeta)}</div>
                  ) : null}
                </div>
              </div>

              <div className={styles.repTable}>
                <div className={styles.repTableH}>Desglose mensual</div>
                <Row l={<>Ingreso bruto <small>({c.N} × {fmt(c.Rh)})</small></>} r={fmt(c.bruto)} />
                <Row l="Comisión InterRoom (15% + IVA)" r={`−${fmt(c.com)}`} neg />
                {limpieza ? <Row l="Limpieza" r={`−${fmt(c.Cl)}`} neg /> : null}
                {suministros ? <Row l="Suministros + wifi" r={`−${fmt(c.Gf)}`} neg /> : null}
                <Row l="Neto mensual" r={fmt(c.neto)} total />
                {c.rentBruta !== null ? <Row l="Rentabilidad bruta anual" r={pct(c.rentBruta)} /> : null}
                {c.rentNeta !== null ? <Row l="Rentabilidad neta anual" r={pct(c.rentNeta)} total /> : null}
              </div>

              <div className={styles.repProp}>
                <div className={styles.repTableH}>Propuesta económica</div>
                <p>
                  <b>Honorarios: 15 % + IVA</b> sobre las rentas de alquiler, excluidos los suministros. Corresponde a la
                  gestión integral del alquiler por habitaciones. Con los datos de este informe:{" "}
                  <b>{fmt(c.com)}/mes</b> (15 % + IVA de {fmt(c.bruto)}).
                </p>
                <p>
                  <b>Suministros:</b> se fija una cuota mensual adicional a la renta de cada habitación. Si el consumo
                  supera el importe previsto, regularizamos la diferencia con los inquilinos según lo pactado en sus
                  contratos. Esta gestión la hacemos nosotros y los suministros no forman parte de la base de cálculo de
                  nuestros honorarios.
                </p>
              </div>

              <div className={styles.repCtas}>
                <div className={styles.repCta}>
                  <div className={styles.repCtaT}>
                    ¿Hablamos de <b>tu piso concreto</b>?
                  </div>
                  <div className={styles.repCtaS}>Valoración gratis en 48 h · WhatsApp 613 096 518</div>
                </div>
                <div className={`${styles.repCta} ${styles.repCtaAlt}`}>
                  <div className={styles.repCtaT}>
                    Vendemos tu casa por solo el <b>1,5% de comisión</b>
                  </div>
                  <div className={styles.repCtaS}>¡Llámanos! 613 096 518</div>
                </div>
              </div>
            </div>

            <footer className={styles.repFoot}>
              <b>InterRoom Murcia</b> · interroommurcia.com · interroommurcia@gmail.com · 613 096 518
            </footer>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function DataItem({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.repDataItem}>
      <div className={styles.repDataK}>{k}</div>
      <div className={styles.repDataV}>{v}</div>
    </div>
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
