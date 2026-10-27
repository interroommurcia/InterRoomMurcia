-- Añadir 'vendedor' como operación válida para clientes (además de alquiler y venta).
alter table public.clientes drop constraint if exists clientes_operacion_check;
alter table public.clientes add constraint clientes_operacion_check
  check (operacion in ('alquiler', 'venta', 'vendedor'));
