-- Columna categoría en gastos de operación y de crédito.
alter table operacion_gastos add column if not exists categoria text not null default 'otros';
alter table credito_gastos add column if not exists categoria text not null default 'otros';
