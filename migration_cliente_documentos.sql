-- Documentos adjuntos a la ficha de un cliente (seguro, factura, DNI, etc.).
-- Imágenes y PDFs que se pueden abrir desde la ficha en Contabilidad.
create table if not exists cliente_documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nombre text not null,
  categoria text not null default 'otro',
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cliente_documentos_cliente on cliente_documentos(cliente_id);
