-- Documentos adjuntos a gastos fijos (facturas, recibos, etc.)
create table if not exists gasto_fijo_documentos (
  id uuid primary key default gen_random_uuid(),
  gasto_fijo_id uuid not null references gastos_fijos(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists gasto_fijo_documentos_gasto_idx on gasto_fijo_documentos (gasto_fijo_id);
