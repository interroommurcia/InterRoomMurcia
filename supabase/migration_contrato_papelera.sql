-- ============================================================
-- PAPELERA DE CONTRATOS: borrado suave. Al "eliminar" un contrato se
-- marca deleted_at en vez de borrar la fila; se puede restaurar desde
-- la papelera y un cron lo purga definitivamente a los 90 días.
-- ============================================================
alter table public.contratos
  add column if not exists deleted_at timestamptz;

create index if not exists contratos_deleted_at_idx on public.contratos (deleted_at);
