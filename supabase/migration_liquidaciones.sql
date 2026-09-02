-- Tabla de liquidaciones: pagos parciales a personas que han adelantado gastos
CREATE TABLE IF NOT EXISTS liquidaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  persona text NOT NULL,
  importe numeric(12,2) NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  concepto text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liquidaciones_all" ON liquidaciones
  FOR ALL USING (true) WITH CHECK (true);
