-- Permite la plantilla "con-anuncios" (raíl lateral con lead de luz y afiliados).
-- Sin esto, publicar un artículo con esa plantilla falla por el check constraint.
alter table public.articulos drop constraint if exists articulos_template_check;
alter table public.articulos
  add constraint articulos_template_check
  check (template in ('clasico', 'minimalista', 'revista', 'con-anuncios'));
