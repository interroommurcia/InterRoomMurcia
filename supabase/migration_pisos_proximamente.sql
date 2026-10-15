-- Añadir columnas para la feature de "Próximamente"
ALTER TABLE pisos ADD COLUMN IF NOT EXISTS num_habitaciones INTEGER;
ALTER TABLE pisos ADD COLUMN IF NOT EXISTS num_banos INTEGER;

-- Asegurar que la columna estado existe
ALTER TABLE pisos ADD COLUMN IF NOT EXISTS estado TEXT;
