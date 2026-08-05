-- Libre en enero (rotaciones) + propietario + valor de compra para rentabilidad
alter table propiedades
  add column if not exists libre_enero boolean not null default false,
  add column if not exists propietario_id uuid references clientes(id) on delete set null,
  add column if not exists valor_compra numeric(12,2);

alter table propiedad_habitaciones
  add column if not exists libre_enero boolean not null default false;

create index if not exists idx_propiedades_propietario on propiedades(propietario_id);
