-- Fuentes oficiales citadas por artículo (GEO/E-E-A-T): enlaces reales a
-- webs oficiales. Array de objetos { "label": string, "url": string }.
-- El contenido de las secciones va en texto plano (HTML escapado), por lo que
-- los enlaces salientes se renderizan desde aquí, no dentro del cuerpo.
alter table articulos
  add column if not exists fuentes jsonb not null default '[]'::jsonb;
