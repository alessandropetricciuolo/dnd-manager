alter table public.profiles
add column if not exists whatsapp_opt_in boolean not null default false;

comment on column public.profiles.whatsapp_opt_in is
  'Consenso del giocatore a essere inserito nella community WhatsApp per comunicazioni di gioco (no spam).';
