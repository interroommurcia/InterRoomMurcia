-- Segundo rol opcional para clientes (p.ej. propietario + comprador finalista).
alter table clientes add column if not exists tipo_secundario text
  check (tipo_secundario in ('propietario','estudiante','comprador','creditos'));
