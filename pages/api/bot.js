import { Telegraf } from 'telegraf'
import { createClient } from '@supabase/supabase-js'

let bot = null

function getBot() {
  if (!bot) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
    setupCommands(bot)
  }
  return bot
}

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

function setupCommands(b) {
  b.start(ctx => ctx.reply(
    '🏀 *Welcome to BasketBattle Bot!*\n\n' +
    'Commands:\n' +
    '/leaderboard — Top 10 players\n' +
    '/top5 — Top 5 players\n' +
    '/rank <username> — Player rank\n' +
    '/stats <username> — Player stats',
    { parse_mode: 'Markdown' }
  ))

  b.command('leaderboard', async ctx => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('users')
      .select('username, wallet_address, total_points, highest_level')
      .order('total_points', { ascending: false })
      .limit(10)

    if (!data?.length) return ctx.reply('No players yet!')

    const medals = ['🥇', '🥈', '🥉']
    let msg = '🏀 *BASKETBATTLE LEADERBOARD*\n\n'
    data.forEach((p, i) => {
      msg += `${medals[i] || `${i + 1}.`} *${p.username}*\n`
      msg += `   💰 \`${short(p.wallet_address)}\`\n`
      msg += `   ⭐ ${p.total_points} pts  |  Lvl ${p.highest_level}\n\n`
    })
    ctx.reply(msg, { parse_mode: 'Markdown' })
  })

  b.command('top5', async ctx => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('users')
      .select('username, wallet_address, total_points, highest_level')
      .order('total_points', { ascending: false })
      .limit(5)

    if (!data?.length) return ctx.reply('No players yet!')

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']
    let msg = '🏀 *TOP 5 PLAYERS*\n\n'
    data.forEach((p, i) => {
      msg += `${medals[i]} *${p.username}* — ${p.total_points} pts\n`
      msg += `   \`${short(p.wallet_address)}\`  |  Lvl ${p.highest_level}\n\n`
    })
    ctx.reply(msg, { parse_mode: 'Markdown' })
  })

  b.command('rank', async ctx => {
    const username = ctx.message.text.split(' ')[1]
    if (!username) return ctx.reply('Usage: /rank <username>')

    const supabase = getSupabase()

    // Find the player first
    const { data: player } = await supabase
      .from('users')
      .select('username, wallet_address, total_points, highest_level')
      .ilike('username', username)
      .single()

    if (!player) return ctx.reply(`Player "${username}" not found.`)

    // Count how many players have more points (efficient rank query)
    const { count: above } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_points', player.total_points)

    const { count: total } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    ctx.reply(
      `🏀 *${player.username}*\n` +
      `📍 Rank: *#${(above || 0) + 1}* of ${total || '?'}\n` +
      `💰 Wallet: \`${short(player.wallet_address)}\`\n` +
      `⭐ Points: ${player.total_points}\n` +
      `🎮 Level: ${player.highest_level}`,
      { parse_mode: 'Markdown' }
    )
  })

  b.command('stats', async ctx => {
    const username = ctx.message.text.split(' ')[1]
    if (!username) return ctx.reply('Usage: /stats <username>')

    const supabase = getSupabase()
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .single()

    if (!data) return ctx.reply(`Player "${username}" not found.`)

    const winRate = data.games_played > 0
      ? Math.round((data.games_won / data.games_played) * 100)
      : 0

    ctx.reply(
      `🏀 *${data.username} Stats*\n\n` +
      `💰 Wallet: \`${short(data.wallet_address)}\`\n` +
      `⭐ Total Points: ${data.total_points}\n` +
      `🎮 Highest Level: ${data.highest_level}\n` +
      `🕹️ Games Played: ${data.games_played}\n` +
      `🏆 Games Won: ${data.games_won}\n` +
      `📊 Win Rate: ${winRate}%`,
      { parse_mode: 'Markdown' }
    )
  })
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'BasketBattle Bot is running 🏀' })
  }

  if (req.method === 'POST') {
    try {
      const b = getBot()
      await b.handleUpdate(req.body)
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('Bot error:', err)
      return res.status(500).json({ error: 'Bot error' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}

export const config = { api: { bodyParser: true } }
