-- Añadir columna estado (text) para unificar disponible/reservada/alquilada/vendida
ALTER TABLE pisos ADD COLUMN IF NOT EXISTS estado text DEFAULT 'disponible';

-- Migrar datos existentes desde los booleanos
UPDATE pisos SET estado = CASE
  WHEN reservada = true THEN 'reservada'
  WHEN disponible = false THEN 'no_disponible'
  ELSE 'disponible'
END
WHERE estado IS NULL OR estado = 'disponible';
