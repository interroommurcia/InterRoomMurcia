-- Fecha inicio/fin de la mensualidad de alquiler en cliente
alter table clientes
  add column if not exists alquiler_fecha_inicio date,
  add column if not exists alquiler_fecha_fin date;

-- Importe de comisión fijo (opcional) por mes; si está seteado, sobrescribe
-- el cálculo por porcentaje sobre el ingreso bruto.
alter table cliente_ingresos
  add column if not exists comision_manual boolean not null default false;
