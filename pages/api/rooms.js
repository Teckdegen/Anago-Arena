import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export default async function handler(req, res) {
  const supabase = getAdmin()

  // GET /api/rooms?game=basketball — list open rooms for a game, clean up stale ones
  if (req.method === 'GET') {
    const gameId = req.query.game

    // Clean up stale rooms (open > 10min, active/finished > 2h)
    const openCutoff   = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const activeCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    await supabase.from('rooms').delete().eq('status', 'open').lt('created_at', openCutoff)
    await supabase.from('rooms').delete().in('status', ['active', 'finished']).lt('created_at', activeCutoff)

    let query = supabase
      .from('rooms')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    // Filter by game if provided
    if (gameId) query = query.eq('game_id', gameId)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ rooms: data || [] })
  }

  // DELETE /api/rooms?id=xxx — delete room when game ends or player quits
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing room id' })

    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
