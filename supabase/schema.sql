create table if not exists public.pisos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null,
  zona text not null check (zona in ('ucam', 'umu', 'upct')),
  barrio text not null,
  precio_mes integer not null,
  metros integer,
  descripcion text not null,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pisos enable row level security;

create policy "Public read access on pisos"
  on public.pisos for select
  using (true);

insert into public.pisos (slug, titulo, zona, barrio, precio_mes, metros, descripcion, disponible) values
  ('habitacion-luminosa-el-carmen', 'Habitación luminosa en El Carmen', 'umu', 'El Carmen, Murcia', 265, 12,
    'Habitación exterior con mucha luz natural, a 10 minutos andando de La Merced. Piso compartido con dos estudiantes más, cocina equipada y wifi de alta velocidad incluido.', true),
  ('doble-con-balcon-guadalupe', 'Habitación con balcón en Guadalupe', 'ucam', 'Guadalupe, Murcia', 255, 14,
    'A 5 minutos a pie del campus de la UCAM. Balcón propio, armario empotrado y zona de estudio. Piso reformado en 2024.', true),
  ('habitacion-espinardo-campus', 'Habitación junto al campus de Espinardo', 'umu', 'Espinardo, Murcia', 240, 11,
    'Piso compartido a 3 minutos andando de las facultades de Espinardo. Ideal para estudiantes de ingeniería o ciencias.', true),
  ('habitacion-centro-cartagena', 'Habitación en el centro de Cartagena', 'upct', 'Centro, Cartagena', 280, 13,
    'A 8 minutos a pie de los campus de la UPCT. Edificio con ascensor, habitación exterior con escritorio incluido.', true),
  ('habitacion-la-nora-tranquila', 'Habitación tranquila en La Ñora', 'ucam', 'La Ñora, Murcia', 245, 12,
    'Zona residencial muy tranquila, a 10 minutos en bus de la UCAM. Piso con jardín compartido y plaza de aparcamiento disponible.', false)
on conflict (slug) do nothing;
