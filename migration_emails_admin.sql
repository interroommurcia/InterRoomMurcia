-- Registro de emails enviados desde la web, para avisar al admin en la home.
-- "visto = false" -> se cuenta en el aviso; el admin pulsa "Visto" y pasan
-- todos a true (no se borran, queda historial).
create table if not exists emails_enviados (
  id uuid primary key default gen_random_uuid(),
  destinatario text not null,
  asunto text not null,
  contexto text,
  visto boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists emails_enviados_visto_idx on emails_enviados (visto, created_at desc);
