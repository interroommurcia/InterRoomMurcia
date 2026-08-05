alter table propiedades
  add column if not exists servicio_wifi boolean not null default false,
  add column if not exists servicio_limpieza boolean not null default false,
  add column if not exists servicio_luz boolean not null default false,
  add column if not exists servicio_agua boolean not null default false,
  add column if not exists tiene_garaje boolean not null default false,
  add column if not exists precio_garaje numeric(10,2);
