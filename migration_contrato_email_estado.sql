-- Estado del envío por email de la copia del contrato firmado al propietario.
-- Permite avisar y mostrar en el panel cuando un email rebota o falla.
--   email_resend_id : id que devuelve Resend al enviar (para casar el webhook).
--   email_estado    : enviado | entregado | rebotado | queja | fallo
--   email_error     : motivo del rebote/fallo (texto de Resend).
--   email_at        : momento del último cambio de estado.
alter table contratos add column if not exists email_resend_id text;
alter table contratos add column if not exists email_estado text;
alter table contratos add column if not exists email_error text;
alter table contratos add column if not exists email_at timestamptz;
