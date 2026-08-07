alter table pisos
  add column if not exists gallery jsonb not null default '[]'::jsonb,
  add column if not exists video_url text;
