import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

const GAME_LABELS = {
  basketball: '🏀 BasketBattle',
  football:   '⚽ Dog Football',
  pong:       '🏓 Paw Pong',
  catch:      '🦴 Bone Catch',
  dash:       '🐾 Dog Dash',
  fetch:      '🎾 Fetch Wars',
  tower:      '🏗️ Bark Tower',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = getAdmin()
  const gameId   = req.query.game   // optional — if set, return per-game leaderboard

  if (gameId && GAME_LABELS[gameId]) {
    // Per-game leaderboard — join with users for username
    const { data: scores, error } = await supabase
      .from('game_scores')
      .select('wallet_address, best_score, games_played, games_won')
      .eq('game_id', gameId)
      .order('best_score', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    // Fetch usernames
    const wallets = (scores || []).map(s => s.wallet_address)
    const { data: users } = await supabase
      .from('users')
      .select('wallet_address, username')
      .in('wallet_address', wallets)

    const userMap = {}
    ;(users || []).forEach(u => { userMap[u.wallet_address] = u.username })

    const leaderboard = (scores || []).map(s => ({
      ...s,
      username: userMap[s.wallet_address] || 'Unknown',
    }))

    return res.status(200).json({
      game_id:    gameId,
      game_label: GAME_LABELS[gameId],
      leaderboard,
      total: leaderboard.length,
    })
  }

  // Central leaderboard — all users by total_points
  const { data, error, count } = await supabase
    .from('users')
    .select('wallet_address, username, total_points, highest_level, games_played, games_won', { count: 'exact' })
    .order('total_points', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({
    leaderboard: data || [],
    total: count || (data || []).length,
  })
}
