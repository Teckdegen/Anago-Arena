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

export const supabase = new Proxy({}, {
  get(_, prop) { return getClient()[prop] }
})

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

// Update stats via API route (uses service key, avoids client-side race conditions)
export async function updateUserStats(wallet, { pointsEarned, level, won }) {
  try {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet,
        points: pointsEarned || 0,
        level:  level || 1,
        won:    !!won,
      }),
    })
    const json = await res.json()
    return { error: res.ok ? null : json.error }
  } catch (e) {
    return { error: e.message }
  }
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

export async function joinRoom(roomId, guestWallet, guestUsername) {
  const { data, error } = await supabase
    .from('rooms')
    .update({
      guest_wallet:   guestWallet.toLowerCase(),
      guest_username: guestUsername,
      status:         'active',
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

// Use a unique channel name per subscription to avoid conflicts
let _roomSubCounter = 0
export function subscribeToRooms(callback) {
  _roomSubCounter++
  return supabase
    .channel(`rooms-lobby-${_roomSubCounter}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, callback)
    .subscribe()
}

// ── Game Scores ────────────────────────────────

export async function upsertGameScore(wallet, gameId, { score, won }) {
  // Use upsert with onConflict to avoid read-then-write race condition
  const addr = wallet.toLowerCase()
  const { data: existing } = await supabase
    .from('game_scores')
    .select('best_score, games_played, games_won')
    .eq('wallet_address', addr)
    .eq('game_id', gameId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('game_scores')
      .update({
        best_score:   Math.max(existing.best_score, score || 0),
        games_played: existing.games_played + 1,
        games_won:    existing.games_won + (won ? 1 : 0),
        updated_at:   new Date().toISOString(),
      })
      .eq('wallet_address', addr)
      .eq('game_id', gameId)
    return { error }
  } else {
    const { error } = await supabase
      .from('game_scores')
      .insert({
        wallet_address: addr,
        game_id:        gameId,
        best_score:     score || 0,
        games_played:   1,
        games_won:      won ? 1 : 0,
      })
    return { error }
  }
}

export async function getGameLeaderboard(gameId, limit = 100) {
  const { data, error, count } = await supabase
    .from('game_scores')
    .select('wallet_address, game_id, best_score, games_played, games_won', { count: 'exact' })
    .eq('game_id', gameId)
    .order('best_score', { ascending: false })
    .limit(Math.min(limit, 200))
  return { data, error, count }
}

export async function getCentralLeaderboard(limit = 100) {
  const { data, error } = await supabase
    .from('users')
    .select('wallet_address, username, total_points, games_played, games_won, highest_level')
    .order('total_points', { ascending: false })
    .limit(Math.min(limit, 200))
  return { data, error }
}

// ── Rooms (game-aware) ─────────────────────────

export async function createGameRoom(hostWallet, hostUsername, gameId, level = 1) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      game_id:       gameId,
      host_wallet:   hostWallet.toLowerCase(),
      host_username: hostUsername,
      level,
      status:        'open',
    })
    .select()
    .single()
  return { data, error }
}

export async function getOpenGameRooms(gameId) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('game_id', gameId)
    .eq('status', 'open')
    .is('guest_wallet', null)
    .order('created_at', { ascending: false })
  return { data, error }
}
