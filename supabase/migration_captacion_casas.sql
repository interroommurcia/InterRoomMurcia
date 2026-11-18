-- ============================================================
-- HOJA DE RUTA DE CONTACTADOS: una hoja de contacto por casa.
-- Lista única editable en /admin/captacion. Se guarda y se va
-- rellenando/actualizando. Sin políticas públicas: el backoffice
-- usa el service role (igual patrón que mesa_trabajo / clientes).
-- ============================================================
create table if not exists public.captacion_casas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default '',
  telefono text not null default '',
  zona text not null default '',
  direccion text not null default '',
  descripcion text not null default '',
  estado text not null default 'contactado'
    check (estado in ('contactado', 'seguimiento', 'captado', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.captacion_casas enable row level security;

create index if not exists captacion_casas_estado_idx on public.captacion_casas (estado);
create index if not exists captacion_casas_created_idx on public.captacion_casas (created_at desc);
