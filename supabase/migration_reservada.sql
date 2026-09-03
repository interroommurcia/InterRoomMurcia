-- Añadir campo reservada a pisos para marca de agua en catálogo
ALTER TABLE pisos ADD COLUMN IF NOT EXISTS reservada boolean DEFAULT false;
