-- Insertar primer usuario admin.
-- CAMBIA el email y la contraseña antes de ejecutar.
-- El password_hash es SHA-256 de la contraseña en texto plano.
-- Para generar el hash de tu contraseña deseada:
--   SELECT encode(sha256('TU_CONTRASEÑA_AQUI'::bytea), 'hex');

-- Ejemplo con contraseña "admin123" (CÁMBIALA):
INSERT INTO usuarios (email, nombre, password_hash, rol)
VALUES (
  'interroommurcia@gmail.com',
  'Admin',
  encode(sha256('admin123'::bytea), 'hex'),
  'admin'
)
ON CONFLICT (email) DO NOTHING;
