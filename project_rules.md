# Project Specification: D&D Campaign Manager (Wiki-Style)

## 1. Project Overview
We are building a web platform for D&D 5e management. It serves as a "Wiki" for Players and a Management Tool for Masters. It is NOT a Virtual Tabletop (VTT). It focuses on organization, booking, and lore exploration.

## 2. Tech Stack
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide React (icons).
- **UI Library:** Shadcn/UI (heavily used for consistency).
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage for images).
- **AI Integration:** OpenAI SDK (or generic fetch) for connecting to Gemini/DALL-E later.

## 3. Core Roles
- **Game Master (GM):** Can create campaigns, maps, NPCs, monsters. Can manage sessions. Has edit rights on everything in their campaigns.
- **Player:** Can register, join campaigns (via invite or public list), book sessions. Can view "explored" maps and known info (Wiki read-only access).

## 4. Database Schema Strategy (Supabase)
We need to model these relationships:
- `profiles`: extends Auth (role: 'gm' | 'player').
- `campaigns`: The main container. Created by GM.
- `sessions`: Linked to Campaign. Has date, time, status, max_players.
- `session_signups`: Link between Player and Session.
- `wiki_entities`: A polymorphic or generic table (or separate tables) for NPCs, Monsters, Items. Must belong to a Campaign.
- `maps`: Stores the image URL (Supabase Storage).
- `map_pins`: Coordinates (x, y) on a Map that link to another Map ID or Wiki Entity ID (parent-child relationship).
- `explorations`: Link between Player and Map/Entity (unlocks visibility).

## 5. Key Features Priority
1.  **Auth & Campaign Management:** Users sign up, GMs create campaigns.
2.  **Session Booking:** Calendar system for session slots.
3.  **Wiki System:** Creating pages for NPCs/Lore.
4.  **Map Navigation:** Image viewer with clickable zones linking to other pages.
5.  **AI Generation:** Server Actions to call Gemini/Image Gen APIs to auto-fill wiki content.

## 6. Design Vibe
- Dark mode default.
- Fantasy aesthetic but clean UI (not cluttered).
- Focus on readability (it's a text-heavy wiki).