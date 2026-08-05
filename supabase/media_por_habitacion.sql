-- Fotos/vídeos vinculables a una habitación concreta
alter table propiedad_media
  add column if not exists habitacion_id uuid references propiedad_habitaciones(id) on delete set null;

create index if not exists idx_pm_habitacion on propiedad_media(habitacion_id);
