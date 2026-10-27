-- Geolocalización y dispositivo en los eventos de seguridad.
-- Permite ver de qué país/región/ciudad vino la IP y si es un navegador real o un bot.
alter table public.security_events add column if not exists pais       text;
alter table public.security_events add column if not exists region     text;
alter table public.security_events add column if not exists ciudad     text;
alter table public.security_events add column if not exists user_agent text;
