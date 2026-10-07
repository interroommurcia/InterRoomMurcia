-- Añadir tipo 'anual' a gastos_fijos para suscripciones anuales.
-- El importe se guarda como coste anual completo; para prorratear a mes se divide por 12.
alter table gastos_fijos drop constraint if exists gastos_fijos_tipo_check;
alter table gastos_fijos add constraint gastos_fijos_tipo_check
  check (tipo in ('fijo','impuesto','anual'));
