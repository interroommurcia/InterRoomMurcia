"use client";

import { useCallback, useEffect, useState } from "react";
import { ArticleEditor, type EditableArticle } from "./ArticleEditor";
import { SITE_URL } from "../../../lib/site";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

type Section = { h2: string; content: string; highlight: string | null; imagePrompt?: string; image?: string };
type FAQ = { question: string; answer: string };

type DraftArticle = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: Section[];
  cta: string;
  faq: FAQ[];
  heroImage?: string;
  heroImageThumb?: string;
  heroImagePrompt?: string;
};

type SavedArticle = {
  id: string;
  slug: string;
  meta_title: string;
  h1: string;
  keyword: string | null;
  estado: "borrador" | "publicado";
  created_at: string;
  hero_image_thumb: string | null;
  views: number | null;
  cta_clicks: number | null;
  mostrar_en_listado: boolean;
  template: "clasico" | "minimalista" | "revista";
};

async function generateArticleFromKeyword(keyword: string, tone: string, material: string | null): Promise<DraftArticle> {
  const res = await fetch("/api/admin/articulos/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, tone, material }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Error generando artículo" }));
    throw new Error(data.error || "Error generando artículo");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();

  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
  try {
    return JSON.parse(jsonMatch ? jsonMatch[1] : raw);
  } catch {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error("Respuesta inválida del modelo");
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      throw new Error("Error parseando respuesta del modelo");
    }
  }
}

async function saveAndPublish(
  article: DraftArticle,
  keyword: string,
  mostrarEnListado: boolean,
  template: "clasico" | "minimalista" | "revista"
): Promise<string> {
  const res = await fetch("/api/admin/articulos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: article.slug,
      meta_title: article.metaTitle,
      meta_description: article.metaDescription,
      h1: article.h1,
      intro: article.intro,
      sections: article.sections,
      cta: article.cta,
      faq: article.faq,
      hero_image: article.heroImage ?? null,
      hero_image_thumb: article.heroImageThumb ?? null,
      keyword,
      mostrar_en_listado: mostrarEnListado,
      template,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error guardando artículo");

  const pub = await fetch("/api/admin/articulos", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: data.id, estado: "publicado" }),
  });
  if (!pub.ok) throw new Error("Guardado pero no se pudo publicar");

  return data.id as string;
}

type BulkItem = { keyword: string; status: "pendiente" | "generando" | "hecho" | "error"; message?: string };

export default function ArticulosManager() {
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState<"cercano" | "profesional">("cercano");
  const [material, setMaterial] = useState("");
  const [template, setTemplate] = useState<"clasico" | "minimalista" | "revista">("clasico");
  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [article, setArticle] = useState<DraftArticle | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedEstado, setSavedEstado] = useState<"borrador" | "publicado" | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [expandedStats, setExpandedStats] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<Record<string, { sources: { label: string; count: number }[]; total: number }>>({});
  const [editingArticle, setEditingArticle] = useState<EditableArticle | null>(null);
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [bulkTone, setBulkTone] = useState<"cercano" | "profesional">("cercano");
  const [bulkTemplate, setBulkTemplate] = useState<"clasico" | "minimalista" | "revista">("clasico");
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  async function runBulkGenerate() {
    const keywords = bulkKeywords
      .split("\n")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) return;

    setBulkRunning(true);
    const items: BulkItem[] = keywords.map((k) => ({ keyword: k, status: "pendiente" }));
    setBulkItems(items);

    for (let i = 0; i < keywords.length; i++) {
      setBulkItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "generando" } : it)));
      try {
        const draft = await generateArticleFromKeyword(keywords[i], bulkTone, null);
        await saveAndPublish(draft, keywords[i], false, bulkTemplate);
        setBulkItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: "hecho" } : it)));
      } catch (e: unknown) {
        setBulkItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: "error", message: e instanceof Error ? e.message : "Error" } : it))
        );
      }
    }

    setBulkRunning(false);
    await loadList();
  }

  async function openEditor(id: string) {
    const res = await fetch(`/api/admin/articulos?id=${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setEditingArticle({
      id: data.id,
      slug: data.slug,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      h1: data.h1,
      intro: data.intro,
      sections: data.sections ?? [],
      cta: data.cta,
      faq: data.faq ?? [],
      keyword: data.keyword ?? null,
      hero_image: data.hero_image ?? null,
      mostrar_en_listado: data.mostrar_en_listado ?? true,
      template: data.template ?? "clasico",
    });
  }

  const loadList = useCallback(async () => {
    setLoadingList(true);
    const res = await fetch("/api/admin/articulos");
    if (res.ok) setSavedArticles(await res.json());
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function generate() {
    if (!keyword.trim()) {
      setError("Introduce la keyword principal");
      return;
    }
    setError("");
    setLoading(true);
    setArticle(null);
    setSavedId(null);
    setSavedEstado(null);
    try {
      const data = await generateArticleFromKeyword(keyword.trim(), tone, material.trim() || null);
      setArticle(data);
    } catch (e: unknown) {
      setError("Error: " + (e instanceof Error ? e.message : "desconocido"));
    } finally {
      setLoading(false);
    }
  }

  async function generateImages() {
    if (!article?.heroImagePrompt) return;
    setLoadingImages(true);
    try {
      const sectionPrompts = article.sections.map((s) => s.imagePrompt).filter(Boolean).slice(0, 3) as string[];
      const res = await fetch("/api/admin/articulos/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: article.slug, heroImagePrompt: article.heroImagePrompt, sectionPrompts }),
      });
      if (!res.ok) return;
      const { images } = await res.json();
      setArticle((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (images.hero) {
          updated.heroImage = images.hero;
          updated.heroImageThumb = images.hero;
        }
        updated.sections = prev.sections.map((s, i) => (images[`s${i}`] ? { ...s, image: images[`s${i}`] } : s));
        return updated;
      });
    } catch {
      /* imágenes opcionales */
    } finally {
      setLoadingImages(false);
    }
  }

  async function saveArticle(publish: boolean) {
    if (!article) return;
    setSaving(true);
    const res = await fetch("/api/admin/articulos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: article.slug,
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        h1: article.h1,
        intro: article.intro,
        sections: article.sections,
        cta: article.cta,
        faq: article.faq,
        hero_image: article.heroImage ?? null,
        hero_image_thumb: article.heroImageThumb ?? null,
        keyword: keyword.trim(),
        template,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSavedId(data.id);
      setSavedEstado("borrador");
      if (publish) await toggleEstado(data.id, "publicado");
      else await loadList();
    }
    setSaving(false);
  }

  async function toggleEstado(id: string, estado: "borrador" | "publicado") {
    const res = await fetch("/api/admin/articulos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    if (res.ok) {
      setSavedEstado(estado);
      await loadList();
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm("¿Eliminar este artículo?")) return;
    await fetch("/api/admin/articulos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await loadList();
    if (savedId === id) {
      setSavedId(null);
      setSavedEstado(null);
    }
  }

  async function toggleStats(slug: string) {
    if (expandedStats === slug) {
      setExpandedStats(null);
      return;
    }
    setExpandedStats(slug);
    if (statsData[slug]) return;
    const res = await fetch(`/api/admin/articulos/stats?slug=${slug}`);
    if (res.ok) {
      const d = await res.json();
      setStatsData((prev) => ({ ...prev, [slug]: d }));
    }
  }

  const borradores = savedArticles.filter((a) => a.estado === "borrador");
  const publicados = savedArticles.filter((a) => a.estado === "publicado");

  return (
    <div className="articulos-manager">
      {editingArticle && (
        <ArticleEditor
          article={editingArticle}
          onClose={() => setEditingArticle(null)}
          onSaved={() => loadList()}
        />
      )}
      <div className="articulos-generator">
        <div className="piso-form">
          <label>
            Keyword principal *
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ej: habitaciones cerca de la UCAM" />
          </label>
          <div className="lead-form-row">
            <label>
              Tono
              <select value={tone} onChange={(e) => setTone(e.target.value as "cercano" | "profesional")}>
                <option value="cercano">Cercano</option>
                <option value="profesional">Profesional</option>
              </select>
            </label>
            <label>
              Plantilla
              <select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
                <option value="clasico">Clásico</option>
                <option value="minimalista">Minimalista</option>
                <option value="revista">Revista</option>
              </select>
            </label>
          </div>
          <label>
            Material de referencia (opcional)
            <textarea rows={4} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Pega texto, datos o notas..." />
          </label>
          {error && <p className="lead-form-error">{error}</p>}
          <div className="lead-form-actions">
            <button type="button" className="btn-primary" onClick={generate} disabled={loading}>
              {loading ? "Generando..." : "Generar artículo"}
            </button>
          </div>
        </div>

        {article && (
          <div className="articulos-meta-card">
            <div className="articulos-meta-label">Meta título ({article.metaTitle.length}/60)</div>
            <div className="articulos-meta-value">{article.metaTitle}</div>
            <div className="articulos-meta-label">Meta descripción ({article.metaDescription.length}/155)</div>
            <div className="articulos-meta-value">{article.metaDescription}</div>
            <div className="articulos-meta-label">URL</div>
            <div className="articulos-meta-value mono">{SITE_HOST}/blog/{article.slug}</div>

            {savedId && savedEstado && (
              <div className={`articulos-status ${savedEstado}`}>
                {savedEstado === "publicado" ? "● Publicado" : "○ Borrador"}
                {savedEstado === "publicado" && (
                  <a href={`/blog/${article.slug}`} target="_blank" rel="noopener">
                    Ver en web -&gt;
                  </a>
                )}
              </div>
            )}

            <div className="lead-form-actions">
              {article.heroImagePrompt && !article.heroImage && (
                <button type="button" className="btn-ghost" onClick={generateImages} disabled={loadingImages}>
                  {loadingImages ? "Generando imágenes..." : "Generar imágenes IA"}
                </button>
              )}
            </div>
            <div className="lead-form-actions">
              {!savedId ? (
                <>
                  <button type="button" className="btn-ghost" onClick={() => saveArticle(false)} disabled={saving}>
                    {saving ? "..." : "Guardar borrador"}
                  </button>
                  <button type="button" className="btn-primary" onClick={() => saveArticle(true)} disabled={saving}>
                    {saving ? "..." : "Publicar"}
                  </button>
                </>
              ) : savedEstado === "borrador" ? (
                <button type="button" className="btn-primary" onClick={() => toggleEstado(savedId, "publicado")}>
                  Publicar en {SITE_HOST}/blog
                </button>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => toggleEstado(savedId, "borrador")}>
                  Despublicar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="articulos-bulk">
        <div className="section-head">
          <h2>Generación masiva</h2>
          <p>Una keyword por línea. Se generan, publican y quedan ocultos del listado del blog (indexables, solo por URL directa).</p>
        </div>
        <div className="piso-form">
          <label>
            Keywords (una por línea)
            <textarea
              rows={6}
              value={bulkKeywords}
              onChange={(e) => setBulkKeywords(e.target.value)}
              placeholder={"habitaciones baratas cerca de la UMU\npisos compartidos en Espinardo\nalquiler estudiantes Cartagena centro"}
              disabled={bulkRunning}
            />
          </label>
          <div className="lead-form-row">
            <label>
              Tono
              <select value={bulkTone} onChange={(e) => setBulkTone(e.target.value as "cercano" | "profesional")} disabled={bulkRunning}>
                <option value="cercano">Cercano</option>
                <option value="profesional">Profesional</option>
              </select>
            </label>
            <label>
              Plantilla
              <select value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value as typeof bulkTemplate)} disabled={bulkRunning}>
                <option value="clasico">Clásico</option>
                <option value="minimalista">Minimalista</option>
                <option value="revista">Revista</option>
              </select>
            </label>
          </div>
          <div className="lead-form-actions">
            <button type="button" className="btn-primary" onClick={runBulkGenerate} disabled={bulkRunning || !bulkKeywords.trim()}>
              {bulkRunning ? "Generando en lote…" : "Generar en lote"}
            </button>
          </div>
        </div>

        {bulkItems.length > 0 && (
          <div className="articulos-bulk-progress">
            {bulkItems.map((it, i) => (
              <div key={i} className="articulos-bulk-row">
                <span className={`articulos-bulk-status ${it.status}`}>
                  {it.status === "pendiente" && "○"}
                  {it.status === "generando" && "⏳"}
                  {it.status === "hecho" && "✓"}
                  {it.status === "error" && "✕"}
                </span>
                <span className="articulos-bulk-keyword">{it.keyword}</span>
                {it.message && <span className="articulos-bulk-message">{it.message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="admin-empty">Claude está redactando el artículo... suele tardar 20-40s.</div>}

      {article && (
        <div className="articulos-preview">
          <div className="article-meta">Vista previa</div>
          <h1>{article.h1}</h1>
          <p className="article-intro">{article.intro}</p>
          {article.heroImage && (
            <div className="article-hero">
              <img src={article.heroImage} alt={article.h1} />
            </div>
          )}
          {article.sections.map((s, i) => (
            <div className="article-section" key={i}>
              <h2>{s.h2}</h2>
              {s.image && <img className="article-section-img" src={s.image} alt={s.h2} />}
              {s.highlight && <blockquote className="article-highlight">{s.highlight}</blockquote>}
              {s.content.split("\n\n").map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          ))}
          {article.cta && (
            <div className="article-cta">
              <p>{article.cta}</p>
            </div>
          )}
          {article.faq.length > 0 && (
            <div className="article-faq">
              <h2>Preguntas frecuentes</h2>
              {article.faq.map((f, i) => (
                <div className="article-faq-item" key={i}>
                  <h3>{f.question}</h3>
                  <p>{f.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="articulos-list-section">
        <div className="section-head">
          <h2>Artículos publicados ({publicados.length})</h2>
        </div>
        {loadingList ? (
          <p className="admin-empty">Cargando...</p>
        ) : publicados.length === 0 ? (
          <p className="admin-empty">No hay artículos publicados aún.</p>
        ) : (
          publicados.map((a) => (
            <ArticleRow
              key={a.id}
              art={a}
              expanded={expandedStats === a.slug}
              stats={statsData[a.slug]}
              onToggleStats={() => toggleStats(a.slug)}
              onToggleEstado={() => toggleEstado(a.id, "borrador")}
              onDelete={() => deleteArticle(a.id)}
              onEdit={() => openEditor(a.id)}
            />
          ))
        )}

        <div className="section-head" style={{ marginTop: 30 }}>
          <h2>Borradores ({borradores.length})</h2>
        </div>
        {loadingList ? (
          <p className="admin-empty">Cargando...</p>
        ) : borradores.length === 0 ? (
          <p className="admin-empty">No hay borradores.</p>
        ) : (
          borradores.map((a) => (
            <ArticleRow
              key={a.id}
              art={a}
              expanded={expandedStats === a.slug}
              stats={statsData[a.slug]}
              onToggleStats={() => toggleStats(a.slug)}
              onToggleEstado={() => toggleEstado(a.id, "publicado")}
              onDelete={() => deleteArticle(a.id)}
              onEdit={() => openEditor(a.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ArticleRow({
  art,
  expanded,
  stats,
  onToggleStats,
  onToggleEstado,
  onDelete,
  onEdit,
}: {
  art: SavedArticle;
  expanded: boolean;
  stats?: { sources: { label: string; count: number }[]; total: number };
  onToggleStats: () => void;
  onToggleEstado: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="pisos-list-item">
      <div className="pisos-list-thumb" style={art.hero_image_thumb ? { backgroundImage: `url(${art.hero_image_thumb})` } : undefined} />
      <div className="pisos-list-body">
        <h4>{art.h1}</h4>
        <div className="loc">
          {art.keyword && <>{art.keyword} · </>}
          {new Date(art.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          {art.estado === "publicado" && (
            <>
              {" "}
              · {art.views ?? 0} vistas · {art.cta_clicks ?? 0} clicks
            </>
          )}
          {art.estado === "publicado" && !art.mostrar_en_listado && (
            <span className="editor-badge-hidden"> · oculto del listado</span>
          )}
          {art.template !== "clasico" && <span> · {art.template}</span>}
        </div>
        {expanded && (
          <div className="articulos-stats-box">
            {!stats ? (
              <span>Cargando...</span>
            ) : stats.total === 0 ? (
              <span>Sin visitas registradas aún.</span>
            ) : (
              stats.sources.map((s) => (
                <div key={s.label} className="articulos-stats-row">
                  <span>{s.label}</span>
                  <span>{s.count}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="pisos-list-actions">
        <button type="button" className="btn-ghost" onClick={onEdit}>
          Editar
        </button>
        {art.estado === "publicado" && (
          <button type="button" className="btn-ghost" onClick={onToggleStats}>
            Stats
          </button>
        )}
        {art.estado === "publicado" && (
          <a href={`/blog/${art.slug}`} target="_blank" rel="noopener" className="btn-ghost">
            Ver
          </a>
        )}
        <button type="button" className="btn-ghost" onClick={onToggleEstado}>
          {art.estado === "publicado" ? "Despublicar" : "Publicar"}
        </button>
        <button type="button" className="btn-ghost" onClick={onDelete}>
          Borrar
        </button>
      </div>
    </div>
  );
}
