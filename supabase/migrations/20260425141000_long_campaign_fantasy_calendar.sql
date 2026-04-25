alter table public.campaigns
  add column if not exists long_calendar_config jsonb,
  add column if not exists long_calendar_base_date jsonb;

alter table public.campaign_characters
  add column if not exists calendar_anchor_date jsonb,
  add column if not exists calendar_anchor_hours integer,
  add column if not exists calendar_current_date jsonb;
