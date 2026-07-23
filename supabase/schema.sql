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

alter table public.pisos add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('pisos', 'pisos', true)
on conflict (id) do nothing;

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

-- ============================================================
-- BLOG / ARTÍCULOS SEO
-- ============================================================
create table if not exists public.articulos (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,
  meta_title            text,
  meta_description      text,
  h1                    text not null,
  intro                 text,
  sections              jsonb default '[]',
  cta                   text,
  faq                   jsonb default '[]',
  hero_image            text,
  hero_image_thumb      text,
  hero_image_credit     text,
  hero_image_credit_url text,
  hero_image_source     text,
  keyword               text,
  estado                text default 'borrador' check (estado in ('borrador','publicado')),
  views                 integer not null default 0,
  cta_clicks            integer not null default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table public.articulos enable row level security;

create policy "Public read access on published articulos"
  on public.articulos for select
  using (estado = 'publicado');

create table if not exists public.articulos_views (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null,
  source     text not null,
  referrer   text,
  created_at timestamptz not null default now()
);

alter table public.articulos_views enable row level security;

create index if not exists articulos_views_slug_idx on public.articulos_views (slug);

alter table public.articulos add column if not exists mostrar_en_listado boolean not null default true;

alter table public.articulos add column if not exists template text not null default 'clasico';
alter table public.articulos drop constraint if exists articulos_template_check;
alter table public.articulos add constraint articulos_template_check check (template in ('clasico', 'minimalista', 'revista'));

create or replace function public.increment_article_stat(p_slug text, p_column text)
returns void
language plpgsql
security definer
as $$
begin
  if p_column = 'views' then
    update public.articulos set views = views + 1 where slug = p_slug;
  elsif p_column = 'cta_clicks' then
    update public.articulos set cta_clicks = cta_clicks + 1 where slug = p_slug;
  end if;
end;
$$;

-- Chatbot: conversaciones del widget de la web y base de conocimiento editable.
-- Sin políticas públicas: solo se accede vía service role desde el servidor
-- (el widget nunca habla directo con Supabase, siempre pasa por /api/chat).
create table if not exists public.chat_conversaciones (
  id uuid primary key default gen_random_uuid(),
  estado text not null default 'abierta' check (estado in ('abierta', 'escalada', 'cerrada')),
  motivo_escalado text,
  nombre text,
  contacto text,
  pagina_origen text,
  mensajes jsonb not null default '[]'::jsonb,
  leido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_conversaciones enable row level security;

create table if not exists public.chat_config (
  id int primary key default 1,
  knowledge_base text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.chat_config enable row level security;

-- ============================================================
-- CONTABILIDAD: fichas de clientes, alquileres (mensual) y
-- compraventas (por operación, con gastos particulares).
-- Sin políticas públicas: el backoffice usa el service role;
-- el enlace de autorrelleno pasa por /api/clientes/completar/[token]
-- que valida el token antes de tocar la fila.
-- ============================================================
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellidos text,
  telefono text,
  email text,
  tipo text not null check (tipo in ('propietario', 'estudiante', 'comprador')),
  zona_interes text,
  operacion text check (operacion in ('alquiler', 'venta')),
  origen text not null default 'manual' check (origen in ('manual', 'lead', 'autocompletado')),
  lead_id integer,
  notas text,
  token uuid not null default gen_random_uuid() unique,
  datos_completados boolean not null default false,
  mensualidad numeric not null default 0,
  comision_pct_alquiler numeric not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clientes enable row level security;
alter table public.clientes add column if not exists mensualidad numeric not null default 0;
alter table public.clientes add column if not exists comision_pct_alquiler numeric not null default 15;
alter table public.clientes add column if not exists email text;

create table if not exists public.cliente_ingresos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mes date not null,
  ingreso_bruto numeric not null,
  comision_pct numeric not null default 15,
  comision_calculada numeric not null,
  cobrado boolean not null default false,
  fecha_cobro date,
  notas text,
  created_at timestamptz not null default now(),
  unique (cliente_id, mes)
);
alter table public.cliente_ingresos enable row level security;
alter table public.cliente_ingresos add column if not exists cobrado boolean not null default false;
alter table public.cliente_ingresos add column if not exists fecha_cobro date;

create table if not exists public.operaciones_compraventa (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha_cierre date not null,
  precio_venta numeric not null,
  comision_pct numeric not null default 3,
  comision_calculada numeric not null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.operaciones_compraventa enable row level security;

create table if not exists public.operacion_gastos (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_compraventa(id) on delete cascade,
  concepto text not null,
  importe numeric not null,
  pagado boolean not null default false,
  fecha_pago date,
  created_at timestamptz not null default now()
);
alter table public.operacion_gastos enable row level security;

-- Documentos (PDFs) adjuntos a una operación de compraventa. Bucket privado:
-- solo se lee/escribe con el service role desde el backoffice o el webhook de Telegram.
create table if not exists public.operacion_documentos (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_compraventa(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
alter table public.operacion_documentos enable row level security;

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Historial conversacional de Gladis (secretaria de Telegram), por chat_id.
create table if not exists public.gladis_conversaciones (
  chat_id text primary key,
  mensajes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.gladis_conversaciones enable row level security;
