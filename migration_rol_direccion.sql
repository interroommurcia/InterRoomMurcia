-- Nuevo rol de backoffice "direccion".
-- Amplía el CHECK de la tabla usuarios para admitirlo.
alter table usuarios drop constraint if exists usuarios_rol_check;
alter table usuarios add constraint usuarios_rol_check check (rol in ('admin', 'comercial', 'direccion'));
