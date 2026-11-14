-- Distingue cómo se generó cada artículo: uno a uno ("unitario") o dentro de
-- una tanda de generación masiva ("masa"). Permite comparar en las stats qué
-- rinde mejor y qué temas de la generación en masa funcionan.
alter table public.articulos
  add column if not exists origen_generacion text not null default 'unitario';

alter table public.articulos drop constraint if exists articulos_origen_generacion_check;
alter table public.articulos
  add constraint articulos_origen_generacion_check
  check (origen_generacion in ('unitario', 'masa'));
