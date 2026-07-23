"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Mensaje = { role: "user" | "assistant"; text: string };

const STORAGE_KEY = "irm_chat_conversation_id";

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationId.current = sessionStorage.getItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [mensajes, loading]);

  async function enviar() {
    const texto = input.trim();
    if (!texto || loading) return;
    setInput("");
    setMensajes((prev) => [...prev, { role: "user", text: texto }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: texto,
          conversationId: conversationId.current,
          pagina: window.location.pathname,
        }),
      });

      const convId = res.headers.get("X-Conversation-Id");
      if (convId) {
        conversationId.current = convId;
        sessionStorage.setItem(STORAGE_KEY, convId);
      }

      if (!res.ok || !res.body) {
        setMensajes((prev) => [...prev, { role: "assistant", text: "Error de conexión, prueba de nuevo." }]);
        return;
      }

      setMensajes((prev) => [...prev, { role: "assistant", text: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMensajes((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", text: copy[copy.length - 1].text + chunk };
          return copy;
        });
      }
    } catch {
      setMensajes((prev) => [...prev, { role: "assistant", text: "Error de conexión, prueba de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget-panel">
          <div className="chat-widget-header">
            <span>Asistente InterRoom Murcia</span>
            <button type="button" className="chat-widget-close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ✕
            </button>
          </div>
          <div className="chat-widget-messages" ref={listRef}>
            {mensajes.length === 0 && (
              <div className="chat-widget-msg assistant">
                Hola, soy el asistente de InterRoom Murcia. ¿Buscas habitación o quieres alquilar tu vivienda?
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`chat-widget-msg ${m.role}`}>
                {m.text || "…"}
              </div>
            ))}
            {loading && mensajes[mensajes.length - 1]?.role !== "assistant" && (
              <div className="chat-widget-msg assistant">…</div>
            )}
          </div>
          <div className="chat-widget-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Escribe tu mensaje…"
              disabled={loading}
            />
            <button type="button" onClick={enviar} disabled={loading || !input.trim()} className="chat-widget-send">
              Enviar
            </button>
          </div>
        </div>
      )}
      <button type="button" className="chat-widget-button" onClick={() => setOpen((v) => !v)}>
        {open ? "Cerrar chat" : "Habla con nosotros"}
      </button>
    </div>
  );
}
