"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../rentabilidad/rentabilidad.module.css";

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

const hoy = () =>
  new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

type Row = { id: number; nombre: string; telefono: string; zona: string; notas: string };
const nuevaFila = (id: number): Row => ({ id, nombre: "", telefono: "", zona: "", notas: "" });

export default function HojaCaptacion() {
  const nextId = useRef(2);
  const [rows, setRows] = useState<Row[]>([nuevaFila(1)]);
  const [fecha, setFecha] = useState("");
  const [qrData, setQrData] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    setFecha(hoy());
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

  const updateCell = (id: number, k: keyof Row) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [k]: val } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, nuevaFila(nextId.current++)]);
  const removeRow = (id: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  const reset = () => {
    nextId.current = 2;
    setRows([nuevaFila(1)]);
  };

  const llenas = useMemo(
    () => rows.filter((r) => r.nombre.trim() || r.telefono.trim() || r.zona.trim() || r.notas.trim()),
    [rows]
  );

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
          filename: "hoja-de-ruta-contactados-interroom.pdf",
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
      {/* Formulario — no entra en el PDF */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Rellenar hoja de ruta</h2>
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

        {rows.map((r, i) => (
          <div key={r.id} className={styles.rutaCard}>
            <div className={styles.rutaCardHead}>
              <h3>Contactado #{i + 1}</h3>
              {rows.length > 1 ? (
                <button type="button" className={styles.rmRow} onClick={() => removeRow(r.id)}>
                  Quitar
                </button>
              ) : null}
            </div>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Nombre</label>
                <div className={styles.inputWrap}>
                  <input type="text" value={r.nombre} placeholder="Ej. María López" onChange={updateCell(r.id, "nombre")} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Teléfono</label>
                <div className={styles.inputWrap}>
                  <input type="text" inputMode="tel" value={r.telefono} placeholder="600 000 000" onChange={updateCell(r.id, "telefono")} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Dirección / zona</label>
                <div className={styles.inputWrap}>
                  <input type="text" value={r.zona} placeholder="Barrio del Carmen" onChange={updateCell(r.id, "zona")} />
                </div>
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label>Descripción / notas</label>
                <div className={styles.inputWrap}>
                  <input type="text" value={r.notas} placeholder="Piso 3 hab, a reformar. Quiere vender antes de verano…" onChange={updateCell(r.id, "notas")} />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" className={styles.addRow} onClick={addRow}>
          + Añadir contactado
        </button>
      </section>

      {/* Lo que se imprime / exporta */}
      <div id="pdf-root">
        <div className={styles.title} style={{ paddingTop: 24 }}>
          <h1>
            Hoja de ruta de <em>contactados</em>.
          </h1>
          <p>Seguimiento de propietarios contactados — InterRoom Murcia.</p>
        </div>

        <section className={styles.heroVenta}>
          <div className={styles.heroVentaL}>
            <h2>
              Vendemos tu casa por solo el <span className={styles.heroPct}>1,5% de comisión</span>.
            </h2>
            <p>
              Fotografía profesional, publicación en los principales portales y gestión completa
              hasta la firma en notaría.
            </p>
          </div>
          {qrData ? (
            <div className={styles.heroQr}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData} alt="QR a interroommurcia.com" />
              <span>Escanea y visítanos</span>
            </div>
          ) : null}
        </section>

        <section className={styles.panel} style={{ margin: "20px 0 8px" }}>
          <div className={styles.panelHead}>
            <h2>Contactados</h2>
            <span className={styles.chip}>{fecha}</span>
          </div>
          <table className={styles.rutaTable}>
            <thead>
              <tr>
                <th className={styles.rutaNum}>#</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Zona</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {llenas.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.rutaEmpty}>
                    Añade contactados arriba para que aparezcan aquí.
                  </td>
                </tr>
              ) : (
                llenas.map((r, i) => (
                  <tr key={r.id}>
                    <td className={styles.rutaNum}>{i + 1}</td>
                    <td className={styles.rutaNm}>{r.nombre.trim() || "—"}</td>
                    <td>{r.telefono.trim() || "—"}</td>
                    <td>{r.zona.trim() || "—"}</td>
                    <td className={styles.rutaNotas}>{r.notas.trim() || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className={styles.ctaVenta}>
          <div className={styles.ctaL}>
            ¿Hablamos de <b>tu vivienda</b>? Valoración gratis en 48 h.
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
