-- Importe fijo de comisión en el alquiler (opcional). Si está seteado, cada
-- mensualidad autogenerada usa este importe en vez de calcular por %.
alter table clientes
  add column if not exists comision_fija_alquiler numeric;

-- Estado de cobro para compraventas y créditos, para poder mostrar
-- "pendiente de pago" en las métricas por modalidad.
alter table operaciones_compraventa
  add column if not exists cobrado boolean not null default false,
  add column if not exists fecha_cobro date;

alter table operaciones_creditos
  add column if not exists cobrado boolean not null default false,
  add column if not exists fecha_cobro date;
