-- Visibilidad de documentos del cliente.
-- Si solo_clientes = true, el documento aparece SOLO en la ficha de Clientes
-- (accesible a comercial/gestora) y queda oculto en la vista de Contabilidad.
-- Lo marca únicamente el rol admin.
alter table cliente_documentos
  add column if not exists solo_clientes boolean not null default false;
