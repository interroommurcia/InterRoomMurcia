-- Cuerpo personalizado del contrato (HTML editado a mano desde el panel).
-- Si es NULL, el contrato se renderiza con la plantilla por defecto.
-- Si tiene contenido, sustituye las cláusulas de la plantilla pero se
-- mantiene la cabecera de marca y el bloque de firmas (para que la firma
-- online siga funcionando).
alter table contratos add column if not exists cuerpo_html text;
