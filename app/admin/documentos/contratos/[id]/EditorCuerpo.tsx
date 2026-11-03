"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Editor del cuerpo del contrato (solo en borrador). Se siembra con las
 * cláusulas reales ya rellenadas; el admin las modifica/añade y al guardar
 * se almacena como cuerpo personalizado. Lo que ve aquí es exactamente lo
 * que se firmará online y se generará en PDF.
 */
export default function EditorCuerpo({ contratoId }: { contratoId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [personalizado, setPersonalizado] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function abrir() {
    setAbierto(true);
    setCargando(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}/cuerpo`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setPersonalizado(Boolean(data.esPersonalizado));
      if (ref.current) ref.current.innerHTML = data.cuerpoHtml || "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el contenido");
    } finally {
      setCargando(false);
    }
  }

  // Limpia el estilo propio de contentEditable al desmontar (no es crítico).
  useEffect(() => () => { document.getSelection()?.removeAllRanges(); }, []);

  function cmd(comando: string, valor?: string) {
    ref.current?.focus();
    document.execCommand(comando, false, valor);
  }

  function insertarClausula() {
    ref.current?.focus();
    const html =
      '<section class="contrato-clause"><div class="contrato-clause-title">Nueva cláusula</div><p>Escribe aquí el texto de la cláusula.</p></section><p><br/></p>';
    document.execCommand("insertHTML", false, html);
  }

  async function guardar() {
    if (!ref.current) return;
    setGuardando(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}/cuerpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuerpoHtml: ref.current.innerHTML }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setPersonalizado(true);
      setMsg("Guardado. La vista previa, la firma y el PDF usarán estas cláusulas.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function restaurar() {
    if (!confirm("¿Descartar tus cambios y volver a la plantilla original?")) return;
    setGuardando(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/contratos/${contratoId}/cuerpo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurar: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setPersonalizado(false);
      setAbierto(false);
      setMsg("Restaurada la plantilla original.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo restaurar");
    } finally {
      setGuardando(false);
    }
  }

  const btn: React.CSSProperties = {
    padding: "6px 12px", border: "1px solid #ddd", background: "#fff",
    borderRadius: 6, cursor: "pointer", fontSize: "0.85rem",
  };

  return (
    <div className="analytics-card" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>✏️ Editar cláusulas</h3>
          <p style={{ fontSize: "0.9rem", opacity: 0.75, margin: "4px 0 0" }}>
            Cambia o añade cláusulas para este cliente. Lo que edites aquí es lo que se firmará y se enviará en el PDF.
            {personalizado && <strong style={{ color: "#059669" }}> · Este contrato tiene cláusulas personalizadas.</strong>}
          </p>
        </div>
        {!abierto && (
          <button type="button" onClick={abrir} style={{ ...btn, padding: "10px 20px", fontWeight: 500 }}>
            {personalizado ? "Editar cláusulas" : "Personalizar cláusulas"}
          </button>
        )}
      </div>

      {abierto && (
        <div style={{ marginTop: 16 }}>
          {cargando ? (
            <p style={{ opacity: 0.7 }}>Cargando contenido…</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <button type="button" style={btn} onClick={() => cmd("bold")}><strong>N</strong></button>
                <button type="button" style={{ ...btn, fontStyle: "italic" }} onClick={() => cmd("italic")}>C</button>
                <button type="button" style={btn} onClick={() => cmd("insertUnorderedList")}>• Lista</button>
                <button type="button" style={btn} onClick={insertarClausula}>+ Cláusula</button>
                <span style={{ flex: 1 }} />
                <button type="button" style={{ ...btn, color: "#dc2626" }} onClick={restaurar} disabled={guardando}>
                  Restaurar plantilla
                </button>
              </div>
              <div style={{ background: "#f4f4f1", padding: "16px 0", borderRadius: 10, maxHeight: 520, overflow: "auto" }}>
                <div
                  ref={ref}
                  contentEditable
                  suppressContentEditableWarning
                  className="contrato-paper"
                  style={{ outline: "none", minHeight: 300 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={guardar}
                  disabled={guardando}
                  style={{ padding: "10px 22px", background: "var(--orange)", color: "#fff", border: 0, borderRadius: 8, fontWeight: 500, cursor: guardando ? "wait" : "pointer", opacity: guardando ? 0.6 : 1 }}
                >
                  {guardando ? "Guardando…" : "Guardar cláusulas"}
                </button>
                <button type="button" onClick={() => setAbierto(false)} style={btn} disabled={guardando}>
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {msg && <p style={{ marginTop: 12, color: "#059669", fontSize: "0.88rem" }}>{msg}</p>}
      {error && (
        <div style={{ marginTop: 12, padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
