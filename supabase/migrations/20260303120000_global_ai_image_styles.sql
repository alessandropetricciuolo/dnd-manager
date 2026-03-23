create table if not exists public.ai_image_styles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text null,
  positive_prompt text not null,
  negative_prompt text null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_image_styles enable row level security;

drop policy if exists "ai_image_styles_read_authenticated" on public.ai_image_styles;
create policy "ai_image_styles_read_authenticated"
on public.ai_image_styles
for select
to authenticated
using (true);

drop policy if exists "ai_image_styles_write_admin" on public.ai_image_styles;
create policy "ai_image_styles_write_admin"
on public.ai_image_styles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

alter table public.campaigns
add column if not exists ai_image_style_key text null references public.ai_image_styles(key) on update cascade on delete set null;

create index if not exists campaigns_ai_image_style_key_idx
on public.campaigns(ai_image_style_key);

insert into public.ai_image_styles (key, name, description, positive_prompt, negative_prompt, sort_order)
values
  (
    'dark_fantasy',
    'Dark Fantasy',
    'Toni cupi, drammatici e medievali.',
    'dark fantasy, grim atmosphere, cinematic chiaroscuro lighting, weathered medieval textures, dramatic composition, realistic detail, moody palette',
    'anime style, cartoon, neon cyberpunk, modern vehicles, sci-fi armor, low detail',
    10
  ),
  (
    'grimdark_sketch',
    'Grimdark Sketch',
    'Stile illustrativo ruvido con inchiostro e texture consumate.',
    'grimdark fantasy sketch, ink wash texture, hand-drawn linework, desaturated palette, rough parchment shading, high detail fantasy illustration',
    'clean vector style, glossy 3d render, vibrant cartoon, flat shading',
    20
  ),
  (
    'heroic_high_fantasy',
    'Heroic High Fantasy',
    'Epico, luminoso, eroico.',
    'heroic high fantasy, epic lighting, majestic scale, detailed armor and fabrics, cinematic composition, rich but natural colors',
    'horror gore, modern city, sci-fi tech, low contrast muddy image',
    30
  ),
  (
    'gothic_horror',
    'Gothic Horror',
    'Atmosfera gotica, tensione e mistero.',
    'gothic fantasy horror, candlelit ambience, fog, ancient stone architecture, dramatic shadows, cinematic realism',
    'bright cheerful palette, cartoon faces, futuristic gadgets, modern clothing',
    40
  ),
  (
    'sword_and_sorcery',
    'Sword and Sorcery',
    'Avventura classica tra acciaio, magia e rovine antiche.',
    'sword and sorcery fantasy art, rugged adventurers, ancient ruins, mystical glow, cinematic action framing, realistic fantasy detail',
    'superhero spandex, cyberpunk neon, anime chibi, modern firearms',
    50
  ),
  (
    'mythic_ancient',
    'Mythic Ancient',
    'Tono mitico e arcaico, monumentale.',
    'mythic ancient fantasy, monumental statues and temples, sacred atmosphere, volumetric light, intricate ornament details, cinematic realism',
    'urban modern skyline, sci-fi mecha, cartoonish proportions, flat low-detail art',
    60
  )
on conflict (key) do nothing;
