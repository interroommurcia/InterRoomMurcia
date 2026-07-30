-- Tipo de gasto recurrente empresa: 'fijo' (mensual) | 'impuesto' (trimestral).
alter table gastos_fijos add column if not exists tipo text not null default 'fijo'
  check (tipo in ('fijo','impuesto'));
