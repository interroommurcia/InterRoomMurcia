-- Gastos fijos mensuales de la empresa (suscripciones, hosting, herramientas, etc.)
-- Se cuentan como coste operativo independiente, no ligados a operaciones.

create table if not exists gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  importe_mensual numeric(10,2) not null check (importe_mensual >= 0),
  categoria text not null default 'otros',
  fecha_inicio date not null default current_date,
  fecha_fin date,
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists gastos_fijos_activo_idx on gastos_fijos (fecha_fin);
