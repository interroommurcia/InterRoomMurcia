-- Visibilidad de documentos del cliente.
-- Si solo_contabilidad = true, el documento aparece SOLO en la vista de
-- Contabilidad (admin) y queda OCULTO en la ficha de Clientes (comercial/gestora).
-- Lo marca únicamente el rol admin, desde Contabilidad.
alter table cliente_documentos
  add column if not exists solo_contabilidad boolean not null default false;
