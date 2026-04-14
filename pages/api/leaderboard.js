import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate')

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = getAdmin()

  // Fetch ALL users — no cap. Admin needs to see every wallet for manual rewards.
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
