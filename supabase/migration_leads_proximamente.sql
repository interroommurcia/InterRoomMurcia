CREATE TABLE IF NOT EXISTS leads_proximamente (
  id SERIAL PRIMARY KEY,
  piso_id TEXT NOT NULL,
  piso_titulo TEXT NOT NULL,
  piso_categoria TEXT NOT NULL DEFAULT 'alquiler',
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
