-- ============================================================
-- ARCHIVO TRIMESTRAL DE FACTURAS
-- 1) Estado "cobrada" en cada factura emitida (entra en la ficha
--    del cliente y en el archivo trimestral al marcarse).
-- 2) Tabla de facturas SUBIDAS a mano (recibidas / de gasto) para
--    archivarlas por meses junto a las emitidas.
-- 3) Las facturas YA NO se autoborran: el archivo es permanente
--    (el cron de limpieza queda desactivado en el código).
-- ============================================================

-- 1) Estado cobrada en las facturas emitidas.
alter table public.facturas add column if not exists cobrada boolean not null default false;
alter table public.facturas add column if not exists cobrada_fecha date;
create index if not exists facturas_cobrada_idx on public.facturas(cobrada);
create index if not exists facturas_fecha_idx on public.facturas(fecha);

-- 2) Facturas subidas a mano (recibidas / de gasto). Se archivan por el
--    mes de su "fecha". El PDF/imagen vive en el bucket privado `facturas`
--    bajo el prefijo subidas/AAAA-MM/.
create table if not exists public.facturas_subidas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  concepto text not null,
  importe numeric,
  notas text,
  nombre_archivo text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table public.facturas_subidas enable row level security;
create index if not exists facturas_subidas_fecha_idx on public.facturas_subidas(fecha);
