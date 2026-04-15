-- ============================================================
-- ANAGO ARENA — Supabase Schema (Basketball + Football only)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Users ────────────────────────────────────────────────────

create table if not exists users (
  id             uuid        default gen_random_uuid() primary key,
  wallet_address text        unique not null,
  username       text        unique not null,
  total_points   integer     default 0,
  highest_level  integer     default 1,
  games_played   integer     default 0,
  games_won      integer     default 0,
  created_at     timestamptz default now()
);

create index if not exists idx_users_total_points on users (total_points desc);

-- ── Per-game scores (basketball + football only) ─────────────

create table if not exists game_scores (
  id             uuid        default gen_random_uuid() primary key,
  wallet_address text        not null,
  game_id        text        not null,   -- 'basketball' | 'football' | 'tennis'
  best_score     integer     default 0,
  games_played   integer     default 0,
  games_won      integer     default 0,
  updated_at     timestamptz default now(),
  unique (wallet_address, game_id)
);

create index if not exists idx_game_scores_game on game_scores (game_id, best_score desc);

-- ── Rooms ────────────────────────────────────────────────────

create table if not exists rooms (
  id             uuid        default gen_random_uuid() primary key,
  game_id        text        default 'basketball',
  host_wallet    text        not null,
  host_username  text        not null,
  level          integer     default 1,
  status         text        default 'open',
  guest_wallet   text,
  guest_username text,
  -- Football-specific: formation chosen by host
  host_formation text        default '4-4-2',
  created_at     timestamptz default now()
);

create index if not exists idx_rooms_status on rooms (game_id, status, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────

alter table users       enable row level security;
alter table game_scores enable row level security;
alter table rooms       enable row level security;

create policy "public read users"       on users       for select using (true);
create policy "insert own user"         on users       for insert with check (true);
create policy "update own user"         on users       for update using (true);

create policy "public read game_scores" on game_scores for select using (true);
create policy "insert game_score"       on game_scores for insert with check (true);
create policy "update game_score"       on game_scores for update using (true);

create policy "public read rooms"       on rooms       for select using (true);
create policy "insert room"             on rooms       for insert with check (true);
create policy "update room"             on rooms       for update using (true);
create policy "delete room"             on rooms       for delete using (true);

-- ── Realtime ─────────────────────────────────────────────────

alter publication supabase_realtime add table rooms;
