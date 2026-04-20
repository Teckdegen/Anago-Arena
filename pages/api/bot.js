import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'

// ── Supabase admin client ─────────────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
}

function short(addr) {
  if (!addr) return 'unknown'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ── Build bot with all commands ───────────────────────────
function buildBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')

  const bot = new Telegraf(token)

  // /start — welcome + game link
  bot.start(ctx => ctx.reply(
    '🏀 *Welcome to ANAGO ARENA!*\n\n' +
    'The ultimate dog sports arena — play basketball, earn points, climb the leaderboard!\n\n' +
    '🎮 *Play now:* https://anago\\-arena\\.vercel\\.app\n\n' +
    '*Commands:*\n' +
    '/play — Get the game link\n' +
    '/leaderboard — Top 10 players\n' +
    '/top5 — Top 5 players\n' +
    '/rank <username> — Player rank\n' +
    '/stats <username> — Player stats',
    { parse_mode: 'MarkdownV2' }
  ))

  // /play — direct game link
  bot.command('play', ctx => ctx.reply(
    '🏀 *ANAGO ARENA*\n\n' +
    'Click to play:\n' +
    'https://anago\\-arena\\.vercel\\.app\n\n' +
    '_Connect your wallet and enter the arena\\!_',
    { parse_mode: 'MarkdownV2' }
  ))

  // /leaderboard — top 10
  bot.command('leaderboard', async ctx => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('users')
        .select('username, wallet_address, total_points, highest_level')
        .order('total_points', { ascending: false })
        .limit(10)

      if (error) throw error
      if (!data?.length) return ctx.reply('No players yet\\! Be the first: https://anago\\-arena\\.vercel\\.app', { parse_mode: 'MarkdownV2' })

      const medals = ['🥇', '🥈', '🥉', '4\\.', '5\\.', '6\\.', '7\\.', '8\\.', '9\\.', '10\\.']
      let msg = '🏀 *ANAGO ARENA — TOP 10*\n\n'
      data.forEach((p, i) => {
        const name = escapeMarkdown(p.username)
        msg += `${medals[i]} *${name}*\n`
        msg += `   ⭐ ${p.total_points} pts  \\|  Lvl ${p.highest_level}\n`
        msg += `   💰 \`${short(p.wallet_address)}\`\n\n`
      })
      msg += '🎮 Play: https://anago\\-arena\\.vercel\\.app'
      ctx.reply(msg, { parse_mode: 'MarkdownV2' })
    } catch (err) {
      console.error('/leaderboard error:', err)
      ctx.reply('❌ Could not fetch leaderboard. Try again later.')
    }
  })

  // /top5
  bot.command('top5', async ctx => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('users')
        .select('username, wallet_address, total_points, highest_level')
        .order('total_points', { ascending: false })
        .limit(5)

      if (error) throw error
      if (!data?.length) return ctx.reply('No players yet\\!', { parse_mode: 'MarkdownV2' })

      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
      let msg = '🏀 *TOP 5 PLAYERS*\n\n'
      data.forEach((p, i) => {
        const name = escapeMarkdown(p.username)
        msg += `${medals[i]} *${name}* — ${p.total_points} pts\n`
        msg += `   \`${short(p.wallet_address)}\`  \\|  Lvl ${p.highest_level}\n\n`
      })
      ctx.reply(msg, { parse_mode: 'MarkdownV2' })
    } catch (err) {
      console.error('/top5 error:', err)
      ctx.reply('❌ Could not fetch top 5. Try again later.')
    }
  })

  // /rank <username>
  bot.command('rank', async ctx => {
    try {
      const parts = ctx.message.text.split(' ')
      const username = parts[1]
      if (!username) return ctx.reply('Usage: /rank <username>')

      const supabase = getSupabase()

      const { data: player, error: pErr } = await supabase
        .from('users')
        .select('username, wallet_address, total_points, highest_level')
        .ilike('username', username)
        .single()

      if (pErr || !player) return ctx.reply(`Player "${username}" not found\\.`, { parse_mode: 'MarkdownV2' })

      const { count: above } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('total_points', player.total_points)

      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const rank = (above || 0) + 1
      const name = escapeMarkdown(player.username)

      ctx.reply(
        `🏀 *${name}*\n` +
        `📍 Rank: *\\#${rank}* of ${total || '?'}\n` +
        `💰 Wallet: \`${short(player.wallet_address)}\`\n` +
        `⭐ Points: ${player.total_points}\n` +
        `🎮 Level: ${player.highest_level}`,
        { parse_mode: 'MarkdownV2' }
      )
    } catch (err) {
      console.error('/rank error:', err)
      ctx.reply('❌ Could not fetch rank. Try again later.')
    }
  })

  // /stats <username>
  bot.command('stats', async ctx => {
    try {
      const parts = ctx.message.text.split(' ')
      const username = parts[1]
      if (!username) return ctx.reply('Usage: /stats <username>')

      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username)
        .single()

      if (error || !data) return ctx.reply(`Player "${username}" not found\\.`, { parse_mode: 'MarkdownV2' })

      const winRate = data.games_played > 0
        ? Math.round((data.games_won / data.games_played) * 100)
        : 0

      const name = escapeMarkdown(data.username)

      ctx.reply(
        `🏀 *${name} Stats*\n\n` +
        `💰 Wallet: \`${short(data.wallet_address)}\`\n` +
        `⭐ Total Points: ${data.total_points}\n` +
        `🎮 Highest Level: ${data.highest_level}\n` +
        `🕹️ Games Played: ${data.games_played}\n` +
        `🏆 Games Won: ${data.games_won}\n` +
        `📊 Win Rate: ${winRate}%`,
        { parse_mode: 'MarkdownV2' }
      )
    } catch (err) {
      console.error('/stats error:', err)
      ctx.reply('❌ Could not fetch stats. Try again later.')
    }
  })

  // Catch-all for unknown commands
  bot.on('text', ctx => {
    ctx.reply(
      'Unknown command\\. Try:\n/play /leaderboard /top5 /rank /stats',
      { parse_mode: 'MarkdownV2' }
    )
  })

  return bot
}

// ── MarkdownV2 escaper ────────────────────────────────────
function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

// ── Webhook handler ───────────────────────────────────────
export default async function handler(req, res) {
  // GET — health check + webhook setup instructions
  if (req.method === 'GET') {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anago-arena.vercel.app'
    return res.status(200).json({
      status: 'ANAGO ARENA Bot is running 🏀',
      webhook: `${appUrl}/api/bot`,
      setup: `curl -X POST https://api.telegram.org/bot${token ? '<token>' : 'MISSING_TOKEN'}/setWebhook -d "url=${appUrl}/api/bot"`,
      token_set: !!token,
    })
  }

  // POST — Telegram webhook
  if (req.method === 'POST') {
    try {
      const bot = buildBot()
      await bot.handleUpdate(req.body)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('Bot handler error:', err.message)
      // Always return 200 to Telegram — otherwise it retries endlessly
      return res.status(200).json({ ok: false, error: err.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}

// Telegraf needs the parsed JSON body — bodyParser must be ON
export const config = { api: { bodyParser: true } }
