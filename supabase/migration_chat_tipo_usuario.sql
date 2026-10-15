-- Añadir campo tipo_usuario a chat_conversaciones
-- Valores: 'propietario', 'estudiante', 'inversor'
ALTER TABLE chat_conversaciones
ADD COLUMN IF NOT EXISTS tipo_usuario text;
