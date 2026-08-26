-- Ampliar CHECK de zona para soportar provincias (compraventa)
ALTER TABLE public.pisos DROP CONSTRAINT IF EXISTS pisos_zona_check;
ALTER TABLE public.pisos ADD CONSTRAINT pisos_zona_check
  CHECK (zona IN ('ucam', 'umu', 'upct', 'murcia', 'almeria', 'andalucia', 'comunidad-valenciana', 'madrid'));
