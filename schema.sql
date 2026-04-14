-- ============================================================
-- BasketBattle — Supabase Schema
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

-- Index for leaderboard queries (sort by points descending)
create index if not exists idx_users_total_points on users (total_points desc);


-- ── Rooms ────────────────────────────────────────────────────

create table if not exists rooms (
  id             uuid        default gen_random_uuid() primary key,
  host_wallet    text        not null,
  host_username  text        not null,
  level          integer     default 1,
  status         text        default 'open',     -- 'open' | 'active' | 'finished'
  guest_wallet   text,
  guest_username text,
  created_at     timestamptz default now()
);

-- Index for fetching open rooms quickly
create index if not exists idx_rooms_status on rooms (status, created_at desc);


-- ── Row-Level Security ───────────────────────────────────────
-- Enable RLS so the anon key can only read/write what it should

alter table users enable row level security;
alter table rooms enable row level security;

-- Anyone can read users (leaderboard is public)
create policy "public read users"
  on users for select
  using (true);

-- Anyone can insert/update their own user row
create policy "insert own user"
  on users for insert
  with check (true);

create policy "update own user"
  on users for update
  using (true);

-- Anyone can read open/active rooms
create policy "public read rooms"
  on rooms for select
  using (true);

-- Anyone can create a room
create policy "insert room"
  on rooms for insert
  with check (true);

-- Anyone can update a room (join or finish it)
create policy "update room"
  on rooms for update
  using (true);

-- Anyone can delete a room (host cleanup on game end)
create policy "delete room"
  on rooms for delete
  using (true);


-- ── Realtime ─────────────────────────────────────────────────
-- Broadcast rooms table changes to the VS Player lobby

alter publication supabase_realtime add table rooms;


-- ── Stale room cleanup ────────────────────────────────────────
-- Handled automatically by /api/rooms on every request.
-- No pg_cron needed — no extra extensions required.
--
-- OPTIONAL: If you want a scheduled job, first enable pg_cron in
-- Supabase Dashboard → Database → Extensions → pg_cron,
-- then run this separately (NOT part of this schema file):
--
--   select cron.schedule(
--     'cleanup-stale-rooms',
--     '*/15 * * * *',
--     $$
--       delete from rooms
--       where status = 'open'
--         and created_at < now() - interval '15 minutes';
--     $$
--   );
