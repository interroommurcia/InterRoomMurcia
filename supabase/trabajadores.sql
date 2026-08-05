-- Trabajadores del equipo + asignación de tareas
create table if not exists trabajadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table mesa_trabajo
  add column if not exists asignado_a uuid references trabajadores(id) on delete set null;

create index if not exists idx_mesa_trabajo_asignado on mesa_trabajo(asignado_a);
