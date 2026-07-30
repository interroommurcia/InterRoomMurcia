-- WIPE COMPLETO DE CONTABILIDAD
-- Ejecutar en Supabase SQL Editor. Respeta orden por FKs.
-- Después: vaciar bucket 'documentos' desde Storage UI (o con el bloque comentado abajo).

begin;

delete from cliente_ingresos;
delete from cliente_gasto;
delete from operacion_gastos;
delete from operacion_documentos;
delete from operaciones_compraventa;
delete from credito_gastos;
delete from credito_documentos;
delete from operaciones_creditos;
delete from clientes;

commit;

-- Bucket storage: descomentar si quieres vaciarlo por SQL en vez de UI.
-- delete from storage.objects where bucket_id = 'documentos';
