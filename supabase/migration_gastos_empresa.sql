-- Migración: gastos empresa (puntuales) + pagado_por/liquidado en gastos_fijos
-- Ejecutar en Supabase SQL Editor.

-- 1) Ampliar gastos_fijos con quién paga y liquidación
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS pagado_por text;
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS liquidado boolean DEFAULT false;
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS fecha_liquidacion date;

-- 2) Nueva tabla para gastos puntuales de empresa
CREATE TABLE IF NOT EXISTS gastos_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto text NOT NULL,
  importe numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  categoria text DEFAULT 'otros',
  pagado_por text,
  liquidado boolean DEFAULT false,
  fecha_liquidacion date,
  notas text,
  created_at timestamptz DEFAULT now()
);

-- 3) RLS abierto (misma política que el resto de tablas admin)
ALTER TABLE gastos_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON gastos_empresa FOR ALL USING (true) WITH CHECK (true);
