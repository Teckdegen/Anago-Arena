/**
 * GET  /api/bot-setup          — check current webhook status
 * POST /api/bot-setup          — register webhook with Telegram
 * DELETE /api/bot-setup        — remove webhook
 *
 * Only works with SUPABASE_SERVICE_KEY set (server-side only, not exposed to client).
 */
export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set in environment variables' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anago-arena.vercel.app'
  const webhookUrl = `${appUrl}/api/bot`
  const tgBase = `https://api.telegram.org/bot${token}`

  // GET — check current webhook info
  if (req.method === 'GET') {
    const r = await fetch(`${tgBase}/getWebhookInfo`)
    const data = await r.json()
    return res.status(200).json({
      current_webhook: data.result,
      desired_webhook: webhookUrl,
      is_correct: data.result?.url === webhookUrl,
    })
  }

  // POST — set webhook
  if (req.method === 'POST') {
    const r = await fetch(`${tgBase}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    })
    const data = await r.json()
    return res.status(200).json({
      ok: data.ok,
      description: data.description,
      webhook_set_to: webhookUrl,
    })
  }

  // DELETE — remove webhook
  if (req.method === 'DELETE') {
    const r = await fetch(`${tgBase}/deleteWebhook?drop_pending_updates=true`)
    const data = await r.json()
    return res.status(200).json({ ok: data.ok, description: data.description })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
