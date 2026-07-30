-- WIPE COMPLETO DE CONTABILIDAD (tolerante: salta tablas que no existan)
-- Ejecutar en Supabase SQL Editor.

do $$
declare
  t text;
  tablas text[] := array[
    'cliente_ingresos',
    'cliente_gasto',
    'operacion_gastos',
    'operacion_documentos',
    'operaciones_compraventa',
    'credito_gastos',
    'credito_documentos',
    'operaciones_creditos',
    'clientes'
  ];
begin
  foreach t in array tablas loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('delete from %I', t);
      raise notice 'Vaciada: %', t;
    else
      raise notice 'Saltada (no existe): %', t;
    end if;
  end loop;
end $$;

-- Bucket storage: descomentar para vaciar por SQL en vez de UI.
-- delete from storage.objects where bucket_id = 'documentos';
