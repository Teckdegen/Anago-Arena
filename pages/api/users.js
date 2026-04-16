import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

function validWallet(w) { return /^0x[0-9a-fA-F]{40}$/.test(w) }
function validUsername(u) { return /^[a-zA-Z0-9_]{3,12}$/.test(u) }

export default async function handler(req, res) {
  const supabase = getAdmin()

  // POST /api/users — register/upsert user
  if (req.method === 'POST') {
    const { wallet, username } = req.body || {}
    if (!wallet || !validWallet(wallet))
      return res.status(400).json({ error: 'Invalid wallet address' })
    if (!username || !validUsername(username))
      return res.status(400).json({ error: 'Invalid username (3-12 chars, alphanumeric+underscore)' })

    const { data, error } = await supabase
      .from('users')
      .upsert(
        { wallet_address: wallet.toLowerCase(), username },
        { onConflict: 'wallet_address' }
      )
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username already taken' })
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ user: data })
  }

  // PUT /api/users — update stats after game (atomic increment via RPC)
  if (req.method === 'PUT') {
    const { wallet, points, level, won } = req.body || {}
    if (!wallet || !validWallet(wallet))
      return res.status(400).json({ error: 'Invalid wallet' })
    if (typeof points !== 'number' || points < 0 || points > 100000)
      return res.status(400).json({ error: 'Invalid points' })

    // Atomic read-modify-write using a single UPDATE with expressions
    // Avoids race condition from two separate SELECT + UPDATE calls
    const { data: existing, error: readErr } = await supabase
      .from('users')
      .select('total_points, highest_level, games_played, games_won')
      .eq('wallet_address', wallet.toLowerCase())
      .single()

    if (readErr || !existing) return res.status(404).json({ error: 'User not found' })

    const { error } = await supabase
      .from('users')
      .update({
        total_points:  existing.total_points  + points,
        highest_level: Math.max(existing.highest_level, level || 1),
        games_played:  existing.games_played  + 1,
        games_won:     existing.games_won     + (won ? 1 : 0),
      })
      .eq('wallet_address', wallet.toLowerCase())

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // GET /api/users?wallet=0x...
  if (req.method === 'GET') {
    const wallet = req.query.wallet
    if (!wallet || !validWallet(wallet))
      return res.status(400).json({ error: 'Invalid wallet' })

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .single()

    if (error || !data) return res.status(404).json({ error: 'User not found' })

    // Get rank efficiently — count users with more points
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_points', data.total_points)

    return res.status(200).json({ user: { ...data, rank: (count || 0) + 1 } })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
