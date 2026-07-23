"use client";

import { useEffect, useState } from "react";

type Mensaje = { role: "user" | "assistant"; text: string; at: string };

type Conversacion = {
  id: string;
  estado: "abierta" | "escalada" | "cerrada";
  motivo_escalado: string | null;
  nombre: string | null;
  contacto: string | null;
  pagina_origen: string | null;
  mensajes: Mensaje[];
  leido: boolean;
  created_at: string;
  updated_at: string;
};

function ordenPrioridad(c: Conversacion) {
  if (c.estado === "escalada" && !c.leido) return 0;
  if (c.estado === "escalada") return 1;
  if (!c.leido) return 2;
  return 3;
}

export default function ChatsManager() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [savingKb, setSavingKb] = useState(false);
  const [kbSaved, setKbSaved] = useState(false);

  async function loadConversaciones() {
    const res = await fetch("/api/admin/chats");
    if (res.ok) setConversaciones(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadConversaciones();
    fetch("/api/admin/chat-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d && setKnowledgeBase(d.knowledgeBase ?? ""))
      .catch(() => {});
  }, []);

  async function toggleExpand(c: Conversacion) {
    const next = expandedId === c.id ? null : c.id;
    setExpandedId(next);
    if (next && !c.leido) {
      await fetch("/api/admin/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, leido: true }),
      });
      setConversaciones((prev) => prev.map((x) => (x.id === c.id ? { ...x, leido: true } : x)));
    }
  }

  async function guardarKb() {
    setSavingKb(true);
    setKbSaved(false);
    const res = await fetch("/api/admin/chat-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ knowledgeBase }),
    });
    setSavingKb(false);
    if (res.ok) {
      setKbSaved(true);
      setTimeout(() => setKbSaved(false), 2000);
    }
  }

  const ordenadas = [...conversaciones].sort((a, b) => ordenPrioridad(a) - ordenPrioridad(b));

  return (
    <div className="chats-manager">
      <div className="piso-form">
        <label>
          Base de conocimiento del asistente
          <textarea
            rows={6}
            value={knowledgeBase}
            onChange={(e) => setKnowledgeBase(e.target.value)}
            placeholder="Preguntas frecuentes, condiciones del servicio, horarios, políticas... el asistente lo usa como contexto en cada conversación."
          />
        </label>
        <div className="lead-form-actions">
          <button type="button" className="btn-primary" onClick={guardarKb} disabled={savingKb}>
            {savingKb ? "Guardando..." : "Guardar"}
          </button>
          {kbSaved && <span>Guardado</span>}
        </div>
      </div>

      <div className="articulos-list-section" style={{ marginTop: 30 }}>
        <div className="section-head">
          <h2>Conversaciones ({conversaciones.length})</h2>
        </div>
        {loading ? (
          <p className="admin-empty">Cargando...</p>
        ) : ordenadas.length === 0 ? (
          <p className="admin-empty">Todavía no hay conversaciones.</p>
        ) : (
          ordenadas.map((c) => (
            <div key={c.id} className="pisos-list-item chat-item">
              <div className="pisos-list-body" onClick={() => toggleExpand(c)} style={{ cursor: "pointer" }}>
                <h4>
                  {c.nombre || "Visitante anónimo"}
                  {!c.leido && <span className="editor-badge-hidden"> · sin leer</span>}
                  {c.estado === "escalada" && <span className="editor-badge-hidden"> · escalada</span>}
                </h4>
                <div className="loc">
                  {c.motivo_escalado && <>{c.motivo_escalado} · </>}
                  {c.contacto && <>{c.contacto} · </>}
                  {c.pagina_origen && <>{c.pagina_origen} · </>}
                  {new Date(c.updated_at).toLocaleString("es-ES")}
                </div>
                {expandedId === c.id && (
                  <div className="chat-transcript">
                    {c.mensajes.map((m, i) => (
                      <div key={i} className={`chat-widget-msg ${m.role}`}>
                        {m.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
