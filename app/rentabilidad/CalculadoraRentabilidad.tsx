"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./rentabilidad.module.css";

declare global {
  interface Window {
    html2pdf?: () => {
      from: (el: Element) => {
        set: (opts: Record<string, unknown>) => { save: () => Promise<void> };
      };
    };
    qrcode?: (typeNumber: number, errorCorrectionLevel: string) => {
      addData: (data: string) => void;
      make: () => void;
      createDataURL: (cellSize?: number, margin?: number) => string;
    };
  }
}

const PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
const QR_CDN = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
const SITE_URL = "https://interroommurcia.com";

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
const COM_A = 0.1;
const COM_B = 0.15;

const placeholders = { N: "4", Rv: "900", Rh: "320", Gf: "150", Cw: "35", Cl: "80", Oc: "3", Mt: "11", Mh: "10" };
const empty: Vals = { N: "", Rv: "", Rh: "", Gf: "", Cw: "", Cl: "", Oc: "", Mt: "", Mh: "" };
type Vals = Record<"N" | "Rv" | "Rh" | "Gf" | "Cw" | "Cl" | "Oc" | "Mt" | "Mh", string>;

const fmt = (n: number) => (isFinite(n) ? `${Math.round(n).toLocaleString("es-ES")} €` : "—");

export default function CalculadoraRentabilidad() {
  const [v, setV] = useState(empty);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [qrData, setQrData] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        await loadScript(QR_CDN);
        if (!window.qrcode) return;
        const qr = window.qrcode(0, "M");
        qr.addData(SITE_URL);
        qr.make();
        setQrData(qr.createDataURL(6, 2));
      } catch {
        /* QR silencioso si falla */
      }
    })();
  }, []);

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
          filename: "rentabilidad-interroom.pdf",
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

  const num = (s: string) => { const n = parseFloat(s); return isFinite(n) ? n : 0; };

  const set = (k: keyof Vals) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, "").replace(/^0+(?=\d)/, "");
    setV((prev) => {
      const next = { ...prev, [k]: raw };
      if (k === "N") {
        const N = Math.max(1, num(raw));
        if (num(prev.Oc) > N) next.Oc = String(N);
      }
      return next;
    });
  };

  const reset = () => setV(empty);

  const calc = useMemo(() => {
    const N = Math.max(1, num(v.N));
    const Rv = num(v.Rv);
    const Rh = num(v.Rh);
    const Gf = num(v.Gf);
    const Cw = num(v.Cw);
    const Cl = num(v.Cl);
    const Ocn = Math.min(N, Math.max(1, num(v.Oc) || N));
    const Mt = Math.min(12, Math.max(1, num(v.Mt)));
    const Mh = Math.min(12, Math.max(1, num(v.Mh)));

    const A_bruto = Rv;
    const A_com = Rv * COM_A * IVA;
    const A_neto = A_bruto - A_com;
    const A_anual = A_neto * Mt;

    const B_bruto = N * Rh * (Ocn / N);
    const B_com = B_bruto * COM_B * IVA;
    const B_serv = Cw + Cl;
    const B_neto = B_bruto - B_com - Gf - B_serv;
    const B_anual = B_neto * Mh;

    const C_bruto = N * Rh;
    const C_com = C_bruto * COM_B * IVA;
    const C_neto = C_bruto - C_com - Gf - B_serv;
    const C_anual = C_neto * Mh;

    const max = Math.max(A_anual, B_anual, C_anual, 1);
    const dB = A_anual > 0 ? ((B_anual - A_anual) / A_anual) * 100 : 0;
    const dC = A_anual > 0 ? ((C_anual - A_anual) / A_anual) * 100 : 0;

    return {
      N, Ocn, Mt, Mh, Gf, Cw, Cl,
      A_bruto, A_com, A_neto, A_anual,
      B_bruto, B_com, B_serv, B_neto, B_anual,
      C_anual,
      max, dB, dC,
    };
  }, [v]);

  const Nopts = Array.from({ length: Math.max(1, num(v.N)) }, (_, i) => i + 1);

  return (
    <main className={styles.main}>
      <div id="pdf-root">
      <div className={styles.title}>
        <h1>
          Tu piso puede rentar <em>más</em>.
          <br />
          Elige cómo.
        </h1>
        <p>
          Mueve los números. Las dos columnas se recalculan en vivo. Comisión fija: <b>10% + IVA</b> tradicional ·{" "}
          <b>15% + IVA</b> por habitaciones.
        </p>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Datos de tu vivienda</h2>
          <div className={styles.headActions}>
            <button type="button" className={styles.reset} onClick={reset}>
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
          <Field label="Renta tradicional" unit="€/mes">
            <input type="text" inputMode="numeric" value={v.Rv} placeholder={placeholders.Rv} onChange={set("Rv")} />
          </Field>
          <Field label="Renta por habitación" unit="€/mes">
            <input type="text" inputMode="numeric" value={v.Rh} placeholder={placeholders.Rh} onChange={set("Rh")} />
          </Field>
          <Field label="Suministros (solo por habitaciones)" unit="€/mes">
            <input type="text" inputMode="numeric" value={v.Gf} placeholder={placeholders.Gf} onChange={set("Gf")} />
          </Field>
          <Field label="Wifi" unit="€/mes">
            <input type="text" inputMode="numeric" value={v.Cw} placeholder={placeholders.Cw} onChange={set("Cw")} />
          </Field>
          <Field label="Limpieza zonas comunes" unit="€/mes">
            <input type="text" inputMode="numeric" value={v.Cl} placeholder={placeholders.Cl} onChange={set("Cl")} />
          </Field>
          <Field label="Habitaciones ocupadas" unit={`de ${calc.N}`}>
            <select value={v.Oc || String(calc.Ocn)} onChange={set("Oc")}>
              {Nopts.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Meses ocupación tradicional" unit="meses/año">
            <input type="text" inputMode="numeric" value={v.Mt} placeholder={placeholders.Mt} onChange={set("Mt")} />
          </Field>
          <Field label="Meses ocupación estudiantes" unit="meses/año">
            <input type="text" inputMode="numeric" value={v.Mh} placeholder={placeholders.Mh} onChange={set("Mh")} />
          </Field>
        </div>
      </section>

      <section className={styles.scenarios}>
        <article className={`${styles.card} ${styles.a}`}>
          <header className={styles.cardHead}>
            <div>
              <h3>Alquiler tradicional</h3>
              <div className={styles.sub}>Vivienda completa · contrato único</div>
            </div>
            <span className={`${styles.chip} ${styles.chipAlt}`}>10% + IVA</span>
          </header>
          <div className={styles.bigMetric}>
            <div className={styles.k}>Neto propietario</div>
            <div className={styles.v}>
              {Math.round(calc.A_neto).toLocaleString("es-ES")}
              <span className={styles.per}>€/mes</span>
            </div>
            <div className={styles.yr}>
              Anual: <b>{fmt(calc.A_anual)}</b>
            </div>
          </div>
          <div className={styles.rows}>
            <Row l="Ingreso bruto" r={`${fmt(calc.A_bruto)}/mes`} />
            <Row l="Comisión InterRoom" r={`−${fmt(calc.A_com)}`} neg />
            <Row l="Neto mensual" r={fmt(calc.A_neto)} total />
          </div>
        </article>

        <article className={`${styles.card} ${styles.b}`}>
          <header className={styles.cardHead}>
            <div>
              <h3>Por habitaciones</h3>
              <div className={styles.sub}>Contratos individuales · wifi y limpieza incluidos</div>
            </div>
            <span className={styles.chip}>15% + IVA</span>
          </header>
          <div className={styles.bigMetric}>
            <div className={styles.k}>Neto propietario</div>
            <div className={styles.v}>
              {Math.round(calc.B_neto).toLocaleString("es-ES")}
              <span className={styles.per}>€/mes</span>
            </div>
            <div className={styles.yr}>
              Anual: <b>{fmt(calc.B_anual)}</b>
            </div>
          </div>
          <div className={styles.rows}>
            <Row l={<>Ingreso bruto <small>({calc.Ocn} de {calc.N} ocupadas)</small></>} r={`${fmt(calc.B_bruto)}/mes`} />
            <Row l="Comisión InterRoom" r={`−${fmt(calc.B_com)}`} neg />
            <Row l="Suministros" r={`−${fmt(calc.Gf)}`} neg />
            <Row l="Wifi + limpieza" r={`−${fmt(calc.B_serv)}`} neg />
            <Row l="Neto mensual" r={fmt(calc.B_neto)} total />
          </div>
        </article>
      </section>

      <section className={styles.compare}>
        <h2>Comparativa anual · neto para el propietario</h2>
        <div className={styles.cap}>La diferencia es lo que te deja InterRoom al final del año en cada modelo.</div>
        <div className={styles.bars}>
          <Bar name="Tradicional" sub={`${calc.Mt} meses/año`} width={(calc.A_anual / calc.max) * 100} amount={fmt(calc.A_anual)} />
          <Bar
            name="Habitaciones"
            sub={`${calc.Mh} meses · ${calc.Ocn} de ${calc.N} ocupadas`}
            width={(calc.B_anual / calc.max) * 100}
            amount={fmt(calc.B_anual)}
            delta={`${calc.dB >= 0 ? "+" : ""}${Math.round(calc.dB)}% vs tradicional`}
            variant="b"
          />
          <Bar
            name="Habitaciones"
            sub={`${calc.Mh} meses · ${calc.N} de ${calc.N} ocupadas`}
            width={(calc.C_anual / calc.max) * 100}
            amount={fmt(calc.C_anual)}
            delta={`${calc.dC >= 0 ? "+" : ""}${Math.round(calc.dC)}% vs tradicional`}
            variant="c"
          />
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaL}>
          ¿Hablamos de <b>tu piso concreto</b>? Valoración gratis en 48 h.
        </div>
        <a
          href="https://wa.me/34613096518?text=Hola%2C%20he%20visto%20la%20calculadora%20de%20rentabilidad%20y%20quiero%20una%20valoraci%C3%B3n%20de%20mi%20piso."
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
        <b>InterRoom Murcia</b> · interroommurcia@gmail.com · L–V 9:30–13:30 y 17:00–20:30
      </div>

      <section className={styles.pdfFooter}>
        <div className={styles.pdfFooterLogo}>
          Inter<span>Room</span> Murcia
        </div>
        <div className={styles.pdfFooterText}>Gestión inmobiliaria integral en Murcia y Cartagena</div>
        {qrData ? (
          <div className={styles.pdfFooterQrWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrData} alt="QR a interroommurcia.com" className={styles.pdfFooterQr} />
            <div className={styles.pdfFooterQrCap}>Escanea para visitarnos</div>
          </div>
        ) : null}
        <a href={SITE_URL} className={styles.pdfFooterLink}>
          interroommurcia.com
        </a>
      </section>
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

function Bar({
  name,
  sub,
  width,
  amount,
  delta,
  variant,
}: {
  name: string;
  sub: string;
  width: number;
  amount: string;
  delta?: string;
  variant?: "b" | "c";
}) {
  const fillClass = variant === "b" ? styles.fillB : variant === "c" ? styles.fillC : "";
  return (
    <div className={styles.barRow}>
      <div className={styles.barName}>
        {name}
        <small>{sub}</small>
      </div>
      <div className={styles.barTrack}>
        <div className={`${styles.barFill} ${fillClass}`} style={{ width: `${Math.max(2, width)}%` }} />
      </div>
      <div className={styles.barAmt}>
        {amount}
        {delta ? <small>{delta}</small> : null}
      </div>
    </div>
  );
}
