-- Enriquecer el tracking de visitas de artículos del blog con
-- device, geo, UTMs y hash de visitante para distinguir únicos y
-- recurrentes. Ejecutar en Supabase SQL editor.

alter table public.articulos_views add column if not exists device        text;
alter table public.articulos_views add column if not exists country       text;
alter table public.articulos_views add column if not exists city          text;
alter table public.articulos_views add column if not exists utm_source    text;
alter table public.articulos_views add column if not exists utm_medium    text;
alter table public.articulos_views add column if not exists utm_campaign  text;
alter table public.articulos_views add column if not exists path          text;
alter table public.articulos_views add column if not exists visitor_hash  text;

create index if not exists articulos_views_created_at_idx on public.articulos_views (created_at desc);
create index if not exists articulos_views_slug_created_idx on public.articulos_views (slug, created_at desc);
create index if not exists articulos_views_visitor_idx on public.articulos_views (slug, visitor_hash);
