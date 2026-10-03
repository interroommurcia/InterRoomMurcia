-- ============================================================
-- FACTURACIÓN: datos fiscales del cliente, histórico de facturas
-- emitidas (se conservan 6 meses), numeración con memoria del
-- último número usado y bucket privado para los PDF.
-- ============================================================

-- Datos fiscales en la ficha del cliente (para autorrellenar la factura).
alter table public.clientes add column if not exists nif text;
alter table public.clientes add column if not exists direccion text;
alter table public.clientes add column if not exists cp_ciudad text;
-- es_empresa decide el modelo de factura: empresa lleva retención IRPF,
-- cliente (particular) no. Ambos reflejan IVA.
alter table public.clientes add column if not exists es_empresa boolean not null default false;

-- Facturas emitidas. Guardamos un SNAPSHOT de los datos fiscales e importes
-- del momento de emisión, para que la factura no cambie aunque luego se edite
-- la ficha del cliente o el emisor.
create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  -- de qué pago pendiente nace la factura (para no facturar dos veces)
  origen text not null check (origen in ('ingreso', 'compraventa', 'alquiler_comision', 'credito', 'manual')),
  origen_id uuid,
  fecha date not null,
  concepto text not null,
  -- snapshot emisor
  emisor_nombre text not null,
  emisor_nif text not null,
  -- snapshot cliente
  cliente_nombre text not null,
  cliente_nif text,
  cliente_direccion text,
  cliente_cp_ciudad text,
  cliente_telefono text,
  es_empresa boolean not null default false,
  -- importes
  base numeric not null,
  iva_pct numeric not null default 21,
  iva_importe numeric not null,
  irpf_pct numeric not null default 0,
  irpf_importe numeric not null default 0,
  total numeric not null,
  lineas jsonb not null default '[]'::jsonb,
  storage_path text,
  created_at timestamptz not null default now()
);
alter table public.facturas enable row level security;
create index if not exists facturas_cliente_idx on public.facturas(cliente_id);
create index if not exists facturas_created_idx on public.facturas(created_at);
create index if not exists facturas_origen_idx on public.facturas(origen, origen_id);

-- Config singleton: último número de factura usado, para sugerir el siguiente.
create table if not exists public.factura_config (
  id int primary key default 1,
  ultimo_numero text,
  updated_at timestamptz not null default now()
);
insert into public.factura_config (id) values (1) on conflict (id) do nothing;

-- Bucket privado para los PDF de factura (solo service role).
insert into storage.buckets (id, name, public)
values ('facturas', 'facturas', false)
on conflict (id) do nothing;
