"use client";

import { useRef, useState } from "react";

type Section = { h2: string; content: string; highlight: string | null; image?: string; video?: string };
type FAQ = { question: string; answer: string };

export type EditableArticle = {
  id: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  sections: Section[];
  cta: string;
  faq: FAQ[];
  keyword: string | null;
  hero_image: string | null;
  mostrar_en_listado: boolean;
  template: "clasico" | "minimalista" | "revista";
};

async function uploadFile(slug: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("slug", slug);
  form.append("file", file);
  const res = await fetch("/api/admin/articulos/upload", { method: "POST", body: form });
  if (!res.ok) {
    const d = await res.json().catch(() => ({ error: "Error subiendo archivo" }));
    throw new Error(d.error || "Error subiendo archivo");
  }
  const { url } = await res.json();
  return url as string;
}

export function ArticleEditor({
  article: initial,
  onClose,
  onSaved,
}: {
  article: EditableArticle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [art, setArt] = useState<EditableArticle>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof EditableArticle>(key: K, val: EditableArticle[K]) {
    setArt((a) => ({ ...a, [key]: val }));
  }
  function setSection<K extends keyof Section>(i: number, key: K, val: Section[K]) {
    setArt((a) => ({ ...a, sections: a.sections.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)) }));
  }
  function setFaq(i: number, key: keyof FAQ, val: string) {
    setArt((a) => ({ ...a, faq: a.faq.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)) }));
  }
  function addSection() {
    setArt((a) => ({ ...a, sections: [...a.sections, { h2: "", content: "", highlight: null }] }));
  }
  function removeSection(i: number) {
    setArt((a) => ({ ...a, sections: a.sections.filter((_, idx) => idx !== i) }));
  }
  function addFaq() {
    setArt((a) => ({ ...a, faq: [...a.faq, { question: "", answer: "" }] }));
  }
  function removeFaq(i: number) {
    setArt((a) => ({ ...a, faq: a.faq.filter((_, idx) => idx !== i) }));
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("hero");
    setError("");
    try {
      const url = await uploadFile(art.slug, file);
      setField("hero_image", url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error subiendo imagen");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  async function handleSectionImageUpload(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(`section-img-${i}`);
    setError("");
    try {
      const url = await uploadFile(art.slug, file);
      setSection(i, "image", url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error subiendo imagen");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  async function handleSectionVideoUpload(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(`section-video-${i}`);
    setError("");
    try {
      const url = await uploadFile(art.slug, file);
      setSection(i, "video", url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error subiendo vídeo (máx. 4MB; para vídeos más grandes usa un enlace de YouTube/Vimeo)");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/articulos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: art.id,
          slug: art.slug,
          meta_title: art.meta_title,
          meta_description: art.meta_description,
          h1: art.h1,
          intro: art.intro,
          sections: art.sections,
          cta: art.cta,
          faq: art.faq,
          keyword: art.keyword,
          hero_image: art.hero_image,
          mostrar_en_listado: art.mostrar_en_listado,
          template: art.template,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Error ${res.status} guardando`);
      } else {
        onSaved();
        onClose();
      }
    } catch (err: unknown) {
      setError("Error de red: " + (err instanceof Error ? err.message : "desconocido"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editor-overlay">
      <div className="editor-panel">
        <div className="editor-header">
          <span className="editor-title">Editar artículo</span>
          <div className="editor-header-actions">
            {error && <span className="editor-error">{error}</span>}
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div className="editor-body">
          <label className="editor-checkbox">
            <input
              type="checkbox"
              checked={art.mostrar_en_listado}
              onChange={(e) => setField("mostrar_en_listado", e.target.checked)}
            />
            Mostrar en el listado del blog (si lo desmarcas, sigue publicado e indexable, pero solo accesible por su URL directa)
          </label>

          <label>
            Plantilla visual
            <select value={art.template} onChange={(e) => setField("template", e.target.value as EditableArticle["template"])}>
              <option value="clasico">Clásico</option>
              <option value="minimalista">Minimalista (con scroll-reveal)</option>
              <option value="revista">Revista (imágenes a ancho completo)</option>
            </select>
          </label>

          <div className="editor-grid-2">
            <label>
              Meta título ({art.meta_title.length}/60)
              <input value={art.meta_title} onChange={(e) => setField("meta_title", e.target.value)} />
            </label>
            <label>
              Keyword / Categoría
              <input value={art.keyword ?? ""} onChange={(e) => setField("keyword", e.target.value || null)} />
            </label>
          </div>

          <label>
            Meta descripción ({art.meta_description.length}/155)
            <textarea rows={2} value={art.meta_description} onChange={(e) => setField("meta_description", e.target.value)} />
          </label>

          <label>
            H1 — Título principal
            <input value={art.h1} onChange={(e) => setField("h1", e.target.value)} />
          </label>

          <label>
            Introducción
            <textarea rows={3} value={art.intro} onChange={(e) => setField("intro", e.target.value)} />
          </label>

          <div className="editor-upload-row">
            <span className="editor-label">Imagen destacada (hero)</span>
            {art.hero_image && <img src={art.hero_image} alt="" className="editor-thumb" />}
            <button type="button" className="btn-ghost" onClick={() => heroInputRef.current?.click()} disabled={uploading === "hero"}>
              {uploading === "hero" ? "Subiendo…" : art.hero_image ? "Cambiar imagen" : "Subir imagen"}
            </button>
            <input ref={heroInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleHeroUpload} />
          </div>

          <div className="editor-section-list">
            <div className="editor-section-list-head">
              <span className="editor-label">Secciones ({art.sections.length})</span>
              <button type="button" className="btn-ghost" onClick={addSection}>
                + Añadir sección
              </button>
            </div>

            {art.sections.map((s, i) => (
              <SectionBlock
                key={i}
                section={s}
                index={i}
                uploading={uploading}
                onChange={(key, val) => setSection(i, key, val)}
                onRemove={() => removeSection(i)}
                onImageUpload={(e) => handleSectionImageUpload(i, e)}
                onVideoUpload={(e) => handleSectionVideoUpload(i, e)}
              />
            ))}
          </div>

          <label>
            CTA
            <textarea rows={2} value={art.cta} onChange={(e) => setField("cta", e.target.value)} />
          </label>

          <div className="editor-section-list">
            <div className="editor-section-list-head">
              <span className="editor-label">FAQ ({art.faq.length})</span>
              <button type="button" className="btn-ghost" onClick={addFaq}>
                + Añadir pregunta
              </button>
            </div>
            {art.faq.map((f, i) => (
              <div className="editor-block" key={i}>
                <div className="editor-block-head">
                  <span>Pregunta {i + 1}</span>
                  <button type="button" className="editor-remove" onClick={() => removeFaq(i)}>
                    ✕
                  </button>
                </div>
                <input value={f.question} onChange={(e) => setFaq(i, "question", e.target.value)} placeholder="Pregunta…" />
                <textarea rows={2} value={f.answer} onChange={(e) => setFaq(i, "answer", e.target.value)} placeholder="Respuesta…" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  index,
  uploading,
  onChange,
  onRemove,
  onImageUpload,
  onVideoUpload,
}: {
  section: Section;
  index: number;
  uploading: string | null;
  onChange: <K extends keyof Section>(key: K, val: Section[K]) => void;
  onRemove: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadingImg = uploading === `section-img-${index}`;
  const uploadingVideo = uploading === `section-video-${index}`;

  return (
    <div className="editor-block">
      <div className="editor-block-head">
        <span>Sección {index + 1}</span>
        <button type="button" className="editor-remove" onClick={onRemove}>
          ✕ Eliminar
        </button>
      </div>
      <input value={section.h2} onChange={(e) => onChange("h2", e.target.value)} placeholder="H2…" />
      <textarea rows={4} value={section.content} onChange={(e) => onChange("content", e.target.value)} placeholder="Contenido…" />
      <input
        value={section.highlight ?? ""}
        onChange={(e) => onChange("highlight", e.target.value || null)}
        placeholder="Destacado (opcional)…"
      />

      <div className="editor-upload-row">
        <span className="editor-label">Imagen</span>
        {section.image && <img src={section.image} alt="" className="editor-thumb" />}
        <button type="button" className="btn-ghost" onClick={() => imgInputRef.current?.click()} disabled={uploadingImg}>
          {uploadingImg ? "Subiendo…" : section.image ? "Cambiar" : "Subir imagen"}
        </button>
        {section.image && (
          <button type="button" className="editor-remove" onClick={() => onChange("image", undefined)}>
            Quitar
          </button>
        )}
        <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onImageUpload} />
      </div>

      <div className="editor-upload-row">
        <span className="editor-label">Vídeo</span>
        <input
          value={section.video ?? ""}
          onChange={(e) => onChange("video", e.target.value || undefined)}
          placeholder="Pega un enlace de YouTube/Vimeo…"
          className="editor-video-input"
        />
        <button type="button" className="btn-ghost" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>
          {uploadingVideo ? "Subiendo…" : "Subir archivo (máx. 4MB)"}
        </button>
        {section.video && (
          <button type="button" className="editor-remove" onClick={() => onChange("video", undefined)}>
            Quitar
          </button>
        )}
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={onVideoUpload} />
      </div>
    </div>
  );
}
