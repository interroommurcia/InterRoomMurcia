"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../../rentabilidad/rentabilidad.module.css";

export type PisoOpcion = { id: string; titulo: string; barrio: string; categoria: string };

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

const CAMPOS = ["nombre", "telefono", "zona", "direccion", "descripcion"] as const;
type Campo = (typeof CAMPOS)[number];

export default function CaptacionManager({ pisos }: { pisos: PisoOpcion[] }) {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | Estado>("todas");
  const [guardados, setGuardados] = useState<Record<string, "guardando" | "guardado">>({});
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
    setGuardados((g) => ({ ...g, [id]: "guardando" }));
    try {
      await fetch(`/api/admin/captacion/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setGuardados((g) => ({ ...g, [id]: "guardado" }));
      setTimeout(() => setGuardados((g) => (g[id] === "guardado" ? { ...g, [id]: undefined as never } : g)), 1600);
    } catch {
      setGuardados((g) => ({ ...g, [id]: undefined as never }));
    }
  }

  function editarCampo(id: string, campo: Campo, valor: string) {
    setCasas((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
    setGuardados((g) => ({ ...g, [id]: "guardando" }));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => patch(id, { [campo]: valor }), 700);
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
              piso: opt ? { id: opt.id, slug: "", titulo: opt.titulo, barrio: opt.barrio, categoria: opt.categoria, image_url: null } : null,
            }
          : c
      )
    );
    patch(id, { piso_id: pisoId || null });
  }

  async function nuevaCasa() {
    const casa = await fetch("/api/admin/captacion", { method: "POST" }).then((r) => r.json());
    if (casa?.id) setCasas((prev) => [casa, ...prev]);
  }

  async function eliminarCasa(id: string) {
    if (!confirm("¿Eliminar esta hoja de contacto? No se puede deshacer.")) return;
    await fetch(`/api/admin/captacion/${id}`, { method: "DELETE" });
    setCasas((prev) => prev.filter((c) => c.id !== id));
  }

  async function descargarPdf() {
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
  }

  const visibles = casas.filter((c) => filtro === "todas" || c.estado === filtro);
  const conDatos = casas.filter((c) => c.nombre.trim() || c.telefono.trim() || c.zona.trim() || c.direccion.trim() || c.descripcion.trim());
  const cuenta = (e: Estado) => casas.filter((c) => c.estado === e).length;

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

      <div className="section-head" style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16 }}>Hojas de contacto ({visibles.length})</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn-ghost" onClick={descargarPdf} disabled={pdfBusy}>
            {pdfBusy ? "Generando PDF..." : "Descargar PDF"}
          </button>
          <button type="button" className="btn-primary" onClick={nuevaCasa}>
            + Nueva casa
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="admin-empty">
          {casas.length === 0 ? "Aún no hay casas. Pulsa “+ Nueva casa” para crear la primera hoja." : "No hay casas en este estado."}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginTop: 14 }}>
          {visibles.map((c) => {
            const meta = estadoMeta(c.estado);
            const estado = guardados[c.id];
            return (
              <div key={c.id} style={{ border: "1px solid #e5e7eb", borderLeft: `4px solid ${meta.color}`, borderRadius: 12, background: "#fff", padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <select
                    value={c.estado}
                    onChange={(e) => cambiarEstado(c.id, e.target.value as Estado)}
                    style={{ padding: "4px 8px", borderRadius: 999, border: `1px solid ${meta.color}`, color: meta.color, fontWeight: 600, fontSize: 13, background: "#fff" }}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                  <span style={{ flex: 1, fontSize: 12, color: estado === "guardando" ? "#9ca3af" : "#2f855a", minHeight: 16 }}>
                    {estado === "guardando" ? "Guardando…" : estado === "guardado" ? "✓ Guardado" : ""}
                  </span>
                  <button type="button" onClick={() => eliminarCasa(c.id)} title="Eliminar" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, lineHeight: 1 }}>
                    ×
                  </button>
                </div>

                <Campo label="Nombre del contactado" value={c.nombre} onChange={(v) => editarCampo(c.id, "nombre", v)} placeholder="Ej. María López" />
                <div style={{ display: "flex", gap: 8 }}>
                  <Campo label="Teléfono" value={c.telefono} onChange={(v) => editarCampo(c.id, "telefono", v)} placeholder="600 000 000" />
                  <Campo label="Zona" value={c.zona} onChange={(v) => editarCampo(c.id, "zona", v)} placeholder="Barrio del Carmen" />
                </div>
                <Campo label="Dirección" value={c.direccion} onChange={(v) => editarCampo(c.id, "direccion", v)} placeholder="Calle, nº, piso…" />
                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 3 }}>
                    Descripción / notas
                  </label>
                  <textarea
                    value={c.descripcion}
                    onChange={(e) => editarCampo(c.id, "descripcion", e.target.value)}
                    rows={3}
                    placeholder="Piso 3 hab, a reformar. Quiere vender antes de verano. Volver a llamar la semana que viene…"
                    style={{ width: "100%", resize: "vertical", minHeight: 64, fontFamily: "inherit", fontSize: 14, padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 3 }}>
                    Vincular al catálogo (opcional)
                  </label>
                  <select
                    value={c.piso_id ?? ""}
                    onChange={(e) => vincularPiso(c.id, e.target.value)}
                    style={{ width: "100%", fontSize: 14, padding: "7px 9px", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "inherit", background: "#fff" }}
                  >
                    <option value="">Sin vincular</option>
                    {pisos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} — {p.barrio} ({p.categoria})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <Link href={`/admin/captacion/${c.id}`} className="btn-ghost" style={{ fontSize: 13, textDecoration: "none" }}>
                    Ver hoja de ruta →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bloque imprimible (oculto): hero 1,5% + QR + tabla de casas con datos */}
      <div style={{ position: "absolute", left: -10000, top: 0, width: 800 }} aria-hidden>
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
              <h2>Contactados</h2>
            </div>
            <table className={styles.rutaTable}>
              <thead>
                <tr>
                  <th className={styles.rutaNum}>#</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Zona</th>
                  <th>Estado</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {conDatos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.rutaEmpty}>Sin contactados todavía.</td>
                  </tr>
                ) : (
                  conDatos.map((c, i) => (
                    <tr key={c.id}>
                      <td className={styles.rutaNum}>{i + 1}</td>
                      <td className={styles.rutaNm}>{c.nombre.trim() || "—"}</td>
                      <td>{c.telefono.trim() || "—"}</td>
                      <td>{[c.zona.trim(), c.direccion.trim()].filter(Boolean).join(" · ") || "—"}</td>
                      <td>{estadoMeta(c.estado).label}</td>
                      <td className={styles.rutaNotas}>{c.descripcion.trim() || "—"}</td>
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
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginTop: 8, flex: 1, minWidth: 0 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", marginBottom: 3 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", fontSize: 14, padding: "7px 9px", border: "1px solid #e5e7eb", borderRadius: 8, fontFamily: "inherit" }}
      />
    </div>
  );
}
