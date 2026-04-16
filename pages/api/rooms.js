import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

export default async function handler(req, res) {
  const supabase = getAdmin()

  // GET — list open rooms, clean up stale ones
  if (req.method === 'GET') {
    // Delete rooms older than 5 minutes (open) or 2 hours (active/finished)
    const openCutoff   = new Date(Date.now() - 5  * 60 * 1000).toISOString()
    const activeCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    await supabase.from('rooms').delete().eq('status', 'open').lt('created_at', openCutoff)
    await supabase.from('rooms').delete().in('status', ['active', 'finished']).lt('created_at', activeCutoff)

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ rooms: data || [] })
  }

  // POST — create room
  if (req.method === 'POST') {
    const { hostWallet, hostUsername, level } = req.body || {}
    if (!hostWallet || !hostUsername) return res.status(400).json({ error: 'Missing fields' })

    const { data, error } = await supabase
      .from('rooms')
      .insert({ host_wallet: hostWallet.toLowerCase(), host_username: hostUsername, level: level || 1, status: 'open' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ room: data })
  }

  // PUT /api/rooms?action=join&id=xxx — join a room
  if (req.method === 'PUT') {
    const { id } = req.query
    const { guestWallet, guestUsername } = req.body || {}
    if (!id || !guestWallet || !guestUsername) return res.status(400).json({ error: 'Missing fields' })

    const { data, error } = await supabase
      .from('rooms')
      .update({ guest_wallet: guestWallet.toLowerCase(), guest_username: guestUsername, status: 'active' })
      .eq('id', id)
      .eq('status', 'open')
      .select()
      .single()

    if (error || !data) return res.status(409).json({ error: 'Room no longer available' })
    return res.status(200).json({ room: data })
  }

  // DELETE /api/rooms?id=xxx — delete room when game ends
  if (req.method === 'DELETE') {
    const { id, wallet } = req.query
    if (!id) return res.status(400).json({ error: 'Missing room id' })

    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
