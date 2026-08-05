-- ============================================================
-- Multi-asignación de tareas
-- ============================================================
create table if not exists mesa_trabajo_asignados (
  tarea_id uuid not null references mesa_trabajo(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  primary key (tarea_id, trabajador_id)
);

-- Migrar datos existentes de mesa_trabajo.asignado_a → junction
insert into mesa_trabajo_asignados (tarea_id, trabajador_id)
select id, asignado_a from mesa_trabajo where asignado_a is not null
on conflict do nothing;

create index if not exists idx_mta_trabajador on mesa_trabajo_asignados(trabajador_id);

-- ============================================================
-- Propiedades (fichas de piso/casa captada)
-- ============================================================
create table if not exists propiedades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'piso',
  nombre text not null,
  direccion text,
  num_habitaciones int not null default 0,
  num_banos int not null default 0,
  precio_total numeric(10,2),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists propiedad_habitaciones (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references propiedades(id) on delete cascade,
  nombre text not null,
  precio numeric(10,2),
  cliente_id uuid references clientes(id) on delete set null,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ph_propiedad on propiedad_habitaciones(propiedad_id);

create table if not exists propiedad_media (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references propiedades(id) on delete cascade,
  tipo text not null default 'foto',
  url text not null,
  storage_path text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_pm_propiedad on propiedad_media(propiedad_id);

-- Bucket público para fotos/vídeos
insert into storage.buckets (id, name, public)
values ('propiedades', 'propiedades', true)
on conflict (id) do update set public = true;
