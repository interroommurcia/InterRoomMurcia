-- Factura adjunta a cada mes cobrado (una por ingreso)
alter table public.cliente_ingresos
  add column if not exists factura_storage_path text;
