-- Añade el tipo 'gestion_alquiler' al check de la tabla contratos.
-- Ejecutar en Supabase SQL editor.

alter table public.contratos drop constraint if exists contratos_tipo_check;
alter table public.contratos
  add constraint contratos_tipo_check
  check (tipo in ('exclusiva_venta', 'gestion_alquiler'));
