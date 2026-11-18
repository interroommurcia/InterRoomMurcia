"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../../rentabilidad/rentabilidad.module.css";
import type { CasaCaptacion } from "../../../../lib/captacion";

const PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
const QR_CDN = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
const SITE_URL = "https://interroommurcia.com";

const ESTADO_LABEL: Record<CasaCaptacion["estado"], string> = {
  contactado: "Contactado",
  seguimiento: "En seguimiento",
  captado: "Captado",
  descartado: "Descartado",
};

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

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

export default function HojaDetalle({ casa }: { casa: CasaCaptacion }) {
  const [qrData, setQrData] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

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

  async function descargarPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      await loadScript(PDF_CDN);
      const el = document.getElementById("pdf-root");
      if (!el || !window.html2pdf) throw new Error("PDF no disponible");
      const slug = casa.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await window
        .html2pdf()
        .from(el)
        .set({
          margin: [10, 10, 10, 10],
          filename: `hoja-contacto-interroom${slug ? "-" + slug : ""}.pdf`,
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
  }

  const meta: { k: string; val: string }[] = [
    { k: "Contactado", val: casa.nombre.trim() || "—" },
    ...(casa.telefono.trim() ? [{ k: "Teléfono", val: casa.telefono.trim() }] : []),
    ...(casa.zona.trim() ? [{ k: "Zona", val: casa.zona.trim() }] : []),
    ...(casa.direccion.trim() ? [{ k: "Dirección", val: casa.direccion.trim() }] : []),
    { k: "Estado", val: ESTADO_LABEL[casa.estado] },
    { k: "Primer contacto", val: fecha(casa.created_at) },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" className="btn-primary" onClick={descargarPdf} disabled={pdfBusy}>
          {pdfBusy ? "Generando PDF..." : "Descargar PDF"}
        </button>
      </div>

      <div id="pdf-root" className={styles.main}>
        <div className={styles.title} style={{ paddingTop: 16 }}>
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
            <p>Fotografía profesional, publicación en los principales portales y gestión completa hasta la firma en notaría.</p>
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
            <h2>Datos del contacto</h2>
            <span className={styles.chip}>{ESTADO_LABEL[casa.estado]}</span>
          </div>
          <div className={styles.sheetMeta}>
            {meta.map((m) => (
              <div key={m.k} className={styles.sheetMetaItem}>
                <span className={styles.k}>{m.k}</span>
                <span className={styles.val}>{m.val}</span>
              </div>
            ))}
          </div>
          {casa.descripcion.trim() ? (
            <div className={styles.sheetMeta} style={{ display: "block", marginTop: 10 }}>
              <span className={styles.k}>Descripción</span>
              <div className={styles.sheetDesc}>{casa.descripcion.trim()}</div>
            </div>
          ) : null}
          {casa.piso ? (
            <div className={styles.sheetMeta} style={{ display: "block", marginTop: 10 }}>
              <span className={styles.k}>Vivienda del catálogo</span>
              <div className={styles.sheetDesc}>
                <b>{casa.piso.titulo}</b> · {casa.piso.barrio} · {casa.piso.categoria}
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.ctaVenta}>
          <div className={styles.ctaL}>
            ¿Hablamos de <b>tu vivienda</b>? Valoración gratis en 48 h.
          </div>
          <a href="tel:+34613096518">Llamar 613 096 518</a>
        </section>

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
          <a href={SITE_URL} className={styles.pdfFooterLink}>interroommurcia.com</a>
        </section>
      </div>

      {casa.piso ? (
        <p style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
          Vinculada a <b>{casa.piso.titulo}</b> del catálogo ·{" "}
          <Link href="/admin/pisos" style={{ color: "var(--orange-dark)" }}>ver en catálogo</Link>
        </p>
      ) : null}
    </div>
  );
}
