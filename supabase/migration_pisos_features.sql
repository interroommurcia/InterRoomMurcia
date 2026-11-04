-- Características del piso que se muestran como iconos en tarjetas y fichas.
-- Booleanos (null = sin rellenar → no se muestra icono).
alter table pisos add column if not exists terraza boolean;
alter table pisos add column if not exists piscina boolean;
alter table pisos add column if not exists garaje boolean;
