-- ============================================================
-- CONTRATOS: encargo de venta en exclusiva (y otros tipos a futuro).
-- Flujo: borrador -> link firma -> firma propietario -> firma agencia
--        -> PDF generado -> enviado por email/Telegram.
-- Los datos del contrato se guardan en jsonb (snapshot al firmar),
-- las firmas también (dataURL de canvas o nombre tipeado + ts + ip).
-- ============================================================

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'exclusiva_venta'
    check (tipo in ('exclusiva_venta')),
  cliente_id uuid references public.clientes(id) on delete set null,
  -- Snapshot de todos los datos del contrato en el momento de generación.
  -- Estructura: { propietario, inmueble, precio_venta, duracion_meses,
  -- comision_pct, penalizacion_pct, agencia }
  datos jsonb not null default '{}'::jsonb,
  estado text not null default 'borrador'
    check (estado in ('borrador','pendiente_firmas','firmado_propietario','firmado_agencia','firmado','cancelado')),
  -- Token público opaco para el enlace de firma. Único.
  signing_token text unique,
  -- Firmas: { mode: 'draw'|'electronic', dataUrl?, nombre_tipeado?,
  --          nombre, dni, ts, ip? }
  firma_propietario jsonb,
  firma_agencia jsonb,
  -- Ruta en el bucket privado 'contratos' una vez generado el PDF.
  pdf_storage_path text,
  -- Timestamp del momento en que ambas partes han firmado.
  firmado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contratos enable row level security;

create index if not exists contratos_cliente_idx on public.contratos(cliente_id);
create index if not exists contratos_token_idx on public.contratos(signing_token);
create index if not exists contratos_estado_idx on public.contratos(estado);
create index if not exists contratos_created_idx on public.contratos(created_at);

-- Bucket privado para los PDFs firmados.
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;
