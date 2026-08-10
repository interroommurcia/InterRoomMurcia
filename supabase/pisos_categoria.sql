-- Separar catálogo en alquiler vs compraventa
alter table public.pisos
  add column if not exists categoria text not null default 'alquiler'
  check (categoria in ('alquiler', 'compraventa'));
