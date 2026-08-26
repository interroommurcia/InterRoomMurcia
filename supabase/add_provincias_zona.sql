-- Quitar CHECK restrictivo de zona para soportar todas las provincias (compraventa)
-- Las zonas de alquiler (ucam, umu, upct) se validan en la app
ALTER TABLE public.pisos DROP CONSTRAINT IF EXISTS pisos_zona_check;
ALTER TABLE public.pisos ADD CONSTRAINT pisos_zona_check
  CHECK (char_length(zona) > 0 AND char_length(zona) <= 40);
