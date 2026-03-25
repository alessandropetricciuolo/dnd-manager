alter table public.campaign_characters
add column if not exists character_class text null,
add column if not exists armor_class integer null,
add column if not exists hit_points integer null;

comment on column public.campaign_characters.character_class is
  'Classe del personaggio (es. Guerriero, Mago).';
comment on column public.campaign_characters.armor_class is
  'Classe Armatura (CA) del personaggio.';
comment on column public.campaign_characters.hit_points is
  'Punti Ferita (PF) correnti del personaggio.';
