"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../rentabilidad/rentabilidad.module.css";

export type PisoOpcion = { id: string; titulo: string; barrio: string; categoria: string; image_url: string | null };

type Estado = "contactado" | "seguimiento" | "captado" | "descartado";
type PisoRef = { id: string; slug: string; titulo: string; barrio: string; categoria: string; image_url: string | null };
type Casa = {
  id: string;
  nombre: string;
  telefono: string;
  zona: string;
  direccion: string;
  descripcion: string;
  estado: Estado;
  piso_id: string | null;
  piso: PisoRef | null;
  created_at: string;
  updated_at: string;
};

const ESTADOS: { value: Estado; label: string; color: string }[] = [
  { value: "contactado", label: "Contactado", color: "#6b7280" },
  { value: "seguimiento", label: "En seguimiento", color: "#ea6a12" },
  { value: "captado", label: "Captado", color: "#2f855a" },
  { value: "descartado", label: "Descartado", color: "#b91c1c" },
];
const estadoMeta = (e: Estado) => ESTADOS.find((x) => x.value === e)!;

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

const CAMPOS = ["nombre", "telefono", "zona", "descripcion"] as const;
type Campo = (typeof CAMPOS)[number];

const cellStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  font: "inherit",
  fontSize: "0.9rem",
  color: "var(--ink, #1a1a1a)",
  padding: "2px 0",
  outline: "none",
  resize: "none",
  overflow: "hidden",
  lineHeight: 1.4,
};

export default function CaptacionManager({ pisos }: { pisos: PisoOpcion[] }) {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"tarjetas" | "hoja">("tarjetas");
  const [filtro, setFiltro] = useState<"todas" | Estado>("todas");
  const [qrData, setQrData] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function cargar() {
    const data = await fetch("/api/admin/captacion").then((r) => r.json());
    setCasas(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
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

  async function patch(id: string, body: Partial<Record<Campo, string> & { estado: Estado; piso_id: string | null }>) {
    try {
      await fetch(`/api/admin/captacion/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* se reintenta al siguiente cambio */
    }
  }

  function editarCampo(id: string, campo: Campo, valor: string) {
    setCasas((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
    clearTimeout(timers.current[id + campo]);
    timers.current[id + campo] = setTimeout(() => patch(id, { [campo]: valor }), 600);
  }

  function cambiarEstado(id: string, estado: Estado) {
    setCasas((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    patch(id, { estado });
  }

  function vincularPiso(id: string, pisoId: string) {
    const opt = pisos.find((p) => p.id === pisoId) ?? null;
    setCasas((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              piso_id: pisoId || null,
              piso: opt ? { id: opt.id, slug: "", titulo: opt.titulo, barrio: opt.barrio, categoria: opt.categoria, image_url: opt.image_url } : null,
            }
          : c
      )
    );
    patch(id, { piso_id: pisoId || null });
  }

  async function nuevaCasa() {
    const casa = await fetch("/api/admin/captacion", { method: "POST" }).then((r) => r.json());
    if (casa?.id) setCasas((prev) => [...prev, casa]);
  }

  async function eliminarCasa(id: string) {
    if (!confirm("¿Eliminar esta casa? No se puede deshacer.")) return;
    await fetch(`/api/admin/captacion/${id}`, { method: "DELETE" });
    setCasas((prev) => prev.filter((c) => c.id !== id));
  }

  async function descargarPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    await new Promise((r) => setTimeout(r, 60)); // deja que se oculte la columna de acciones
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
  }

  const visibles = casas.filter((c) => filtro === "todas" || c.estado === filtro);
  const cuenta = (e: Estado) => casas.filter((c) => c.estado === e).length;

  const autoGrow = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget;
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  };

  if (loading) return <p className="admin-empty">Cargando...</p>;

  return (
    <div className="contabilidad-manager">
      <div className="contabilidad-tabs">
        <button type="button" className={`contabilidad-tab${filtro === "todas" ? " active" : ""}`} onClick={() => setFiltro("todas")}>
          Todas ({casas.length})
        </button>
        {ESTADOS.map((e) => (
          <button key={e.value} type="button" className={`contabilidad-tab${filtro === e.value ? " active" : ""}`} onClick={() => setFiltro(e.value)}>
            {e.label} ({cuenta(e.value)})
          </button>
        ))}
      </div>

      {view === "tarjetas" ? (
        <>
          <div className="section-head" style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 16 }}>Casas ({visibles.length})</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" onClick={() => setView("hoja")}>
                Ver hoja de ruta →
              </button>
              <button type="button" className="btn-primary" onClick={nuevaCasa}>
                + Nueva casa
              </button>
            </div>
          </div>

          {visibles.length === 0 ? (
            <p className="admin-empty">
              {casas.length === 0 ? "Aún no hay casas. Pulsa “+ Nueva casa” para crear la primera." : "No hay casas en este estado."}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginTop: 14 }}>
              {visibles.map((c) => {
                const meta = estadoMeta(c.estado);
                const titulo = c.piso?.titulo || c.nombre.trim() || "Casa sin vincular";
                const img = c.piso?.image_url;
                return (
                  <div key={c.id} style={{ border: "1px solid #e5e7eb", borderTop: `4px solid ${meta.color}`, borderRadius: 12, background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 130, background: "#f3f4f6", position: "relative" }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 32 }}>🏠</div>
                      )}
                      <button type="button" onClick={() => eliminarCasa(c.id)} title="Eliminar" style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
                        ×
                      </button>
                    </div>
                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{titulo}</div>
                      <select
                        value={c.estado}
                        onChange={(e) => cambiarEstado(c.id, e.target.value as Estado)}
                        style={{ padding: "5px 8px", borderRadius: 999, border: `1px solid ${meta.color}`, color: meta.color, fontWeight: 600, fontSize: 12, background: "#fff" }}
                      >
                        {ESTADOS.map((e) => (
                          <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                      </select>
                      <select
                        value={c.piso_id ?? ""}
                        onChange={(e) => vincularPiso(c.id, e.target.value)}
                        style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
                      >
                        <option value="">Sin vincular al catálogo</option>
                        {pisos.map((p) => (
                          <option key={p.id} value={p.id}>{p.titulo} — {p.barrio}</option>
                        ))}
                      </select>
                      <button type="button" className="btn-ghost" onClick={() => setView("hoja")} style={{ marginTop: "auto", fontSize: 13 }}>
                        Ver hoja de ruta →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="section-head" style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 16 }}>Hoja de ruta — edición en vivo</h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn-ghost" onClick={() => setView("tarjetas")}>
                ← Tarjetas
              </button>
              <button type="button" className="btn-ghost" onClick={nuevaCasa}>
                + Añadir línea
              </button>
              <button type="button" className="btn-primary" onClick={descargarPdf} disabled={pdfBusy}>
                {pdfBusy ? "Generando PDF..." : "Descargar PDF"}
              </button>
            </div>
          </div>

          <div id="pdf-root" className={styles.main} style={{ marginTop: 8 }}>
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
                <h2>Contactados</h2>
              </div>
              <table className={styles.rutaTable}>
                <thead>
                  <tr>
                    <th className={styles.rutaNum}>#</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Zona</th>
                    <th>Notas</th>
                    {!pdfBusy ? <th style={{ width: 28 }} /> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibles.length === 0 ? (
                    <tr>
                      <td colSpan={pdfBusy ? 5 : 6} className={styles.rutaEmpty}>
                        Pulsa “+ Añadir línea” para empezar.
                      </td>
                    </tr>
                  ) : (
                    visibles.map((c, i) => (
                      <tr key={c.id}>
                        <td className={styles.rutaNum}>{i + 1}</td>
                        <td className={styles.rutaNm} style={{ minWidth: 120 }}>
                          <input type="text" value={c.nombre} placeholder="Nombre" onChange={(e) => editarCampo(c.id, "nombre", e.target.value)} style={{ ...cellStyle, fontWeight: 700 }} />
                        </td>
                        <td style={{ minWidth: 110 }}>
                          <input type="text" inputMode="tel" value={c.telefono} placeholder="—" onChange={(e) => editarCampo(c.id, "telefono", e.target.value)} style={cellStyle} />
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <input type="text" value={c.zona} placeholder="—" onChange={(e) => editarCampo(c.id, "zona", e.target.value)} style={cellStyle} />
                        </td>
                        <td className={styles.rutaNotas} style={{ minWidth: 180 }}>
                          <textarea rows={1} value={c.descripcion} placeholder="—" onChange={(e) => editarCampo(c.id, "descripcion", e.target.value)} onInput={autoGrow} style={cellStyle} />
                        </td>
                        {!pdfBusy ? (
                          <td style={{ textAlign: "center" }}>
                            <button type="button" onClick={() => eliminarCasa(c.id)} title="Eliminar" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, lineHeight: 1 }}>
                              ×
                            </button>
                          </td>
                        ) : null}
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
        </>
      )}
    </div>
  );
}
