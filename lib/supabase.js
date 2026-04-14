import { createClient } from '@supabase/supabase-js'

// Lazy singleton — only created on first use (browser/runtime), never at build time
let _client = null
function getClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env vars missing')
    _client = createClient(url, key)
  }
  return _client
}

// Keep named export for any direct usage
export const supabase = new Proxy({}, {
  get(_, prop) { return getClient()[prop] }
})

/* ──────────────────────────────────────────────
   Supabase Schema (run in SQL editor):

   create table users (
     id uuid default gen_random_uuid() primary key,
     wallet_address text unique not null,
     username text unique not null,
     total_points integer default 0,
     highest_level integer default 1,
     games_played integer default 0,
     games_won integer default 0,
     created_at timestamptz default now()
   );

   create table rooms (
     id uuid default gen_random_uuid() primary key,
     host_wallet text not null,
     host_username text not null,
     level integer default 1,
     status text default 'open',
     guest_wallet text,
     guest_username text,
     created_at timestamptz default now()
   );

   alter publication supabase_realtime add table rooms;
────────────────────────────────────────────── */

// ── Users ──────────────────────────────────────

export async function upsertUser(wallet, username) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { wallet_address: wallet.toLowerCase(), username },
      { onConflict: 'wallet_address' }
    )
    .select()
    .single()
  return { data, error }
}

export async function getUser(wallet) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', wallet.toLowerCase())
    .single()
  return { data, error }
}

export async function updateUserStats(wallet, { pointsEarned, level, won }) {
  const { data: existing } = await getUser(wallet)
  if (!existing) return { error: 'User not found' }

  const updates = {
    total_points: existing.total_points + (pointsEarned || 0),
    highest_level: Math.max(existing.highest_level, level || 1),
    games_played: existing.games_played + 1,
  }
  if (won) updates.games_won = existing.games_won + 1

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('wallet_address', wallet.toLowerCase())
  return { error }
}

export async function getLeaderboard(limit = 50) {
  const { data, error } = await supabase
    .from('users')
    .select('wallet_address, username, total_points, highest_level, games_played, games_won')
    .order('total_points', { ascending: false })
    .limit(Math.min(limit, 100))
  return { data, error }
}

// ── Rooms ──────────────────────────────────────

export async function createRoom(hostWallet, hostUsername, level) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      host_wallet: hostWallet.toLowerCase(),
      host_username: hostUsername,
      level: level || 1,
      status: 'open',
    })
    .select()
    .single()
  return { data, error }
}

export async function getOpenRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'open')
    .is('guest_wallet', null)   // only rooms with no guest yet
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function joinRoom(roomId, guestWallet, guestUsername) {
  const { data, error } = await supabase
    .from('rooms')
    .update({
      guest_wallet: guestWallet.toLowerCase(),
      guest_username: guestUsername,
      status: 'active',
    })
    .eq('id', roomId)
    .eq('status', 'open')
    .select()
    .single()
  return { data, error }
}

export async function deleteRoom(roomId) {
  const { error } = await supabase.from('rooms').delete().eq('id', roomId)
  return { error }
}

export function subscribeToRooms(callback) {
  return supabase
    .channel('public:rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, callback)
    .subscribe()
}
