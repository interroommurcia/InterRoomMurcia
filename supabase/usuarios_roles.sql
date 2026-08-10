-- ============================================================
-- USUARIOS DEL BACKOFFICE con roles
-- ============================================================
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nombre text not null,
  password_hash text not null,
  rol text not null default 'comercial' check (rol in ('admin', 'comercial')),
  activo boolean not null default true,
  trabajador_id uuid references public.trabajadores(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usuarios enable row level security;

-- Mesa de trabajo: vincular tareas al usuario
alter table public.mesa_trabajo
  add column if not exists usuario_id uuid references public.usuarios(id) on delete set null;

create index if not exists idx_mesa_trabajo_usuario on mesa_trabajo(usuario_id);

-- Propiedades: comercial asignado (quién la lleva)
alter table public.propiedades
  add column if not exists asignado_a uuid references public.usuarios(id) on delete set null;

create index if not exists idx_propiedades_asignado on propiedades(asignado_a);
