import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useDisconnect } from 'wagmi'
import { DogIcon, PawIcon, TrophyIcon } from '../components/Icons'

function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

const GAMES = [
  {
    id: 'basketball',
    name: 'BasketBattle',
    emoji: '🏀',
    desc: 'Jump, aim & shoot. First to 100 pts wins.',
    color: '#C17A2A',
    shadow: '#8A4A0A',
    bg: 'rgba(193,122,42,0.15)',
    route: '/game',
    tag: 'ORIGINAL',
    tagColor: '#F0B429',
  },
  {
    id: 'football',
    name: 'Dog Football',
    emoji: '⚽',
    desc: 'Tap to kick. Score goals before time runs out.',
    color: '#27AE60',
    shadow: '#1A6B3A',
    bg: 'rgba(39,174,96,0.15)',
    route: '/games/football',
    tag: 'NEW',
    tagColor: '#27AE60',
  },
  {
    id: 'pong',
    name: 'Paw Pong',
    emoji: '🏓',
    desc: 'Classic pong with dog paddles. 3 lives each.',
    color: '#5B3FDB',
    shadow: '#3A2490',
    bg: 'rgba(91,63,219,0.15)',
    route: '/games/pong',
    tag: 'NEW',
    tagColor: '#5B3FDB',
  },
  {
    id: 'catch',
    name: 'Bone Catch',
    emoji: '🦴',
    desc: 'Catch falling bones. Golden bones = 3x points!',
    color: '#E8A020',
    shadow: '#9A6010',
    bg: 'rgba(232,160,32,0.15)',
    route: '/games/catch',
    tag: 'NEW',
    tagColor: '#E8A020',
  },
  {
    id: 'dash',
    name: 'Dog Dash',
    emoji: '🐾',
    desc: 'Race side by side. Tap to jump over obstacles.',
    color: '#E05050',
    shadow: '#9A2020',
    bg: 'rgba(224,80,80,0.15)',
    route: '/games/dash',
    tag: 'NEW',
    tagColor: '#E05050',
  },
  {
    id: 'fetch',
    name: 'Fetch Wars',
    emoji: '🎾',
    desc: 'Race to the ball. Throw it into the opponent\'s goal.',
    color: '#F4A0A0',
    shadow: '#9A4040',
    bg: 'rgba(244,160,160,0.15)',
    route: '/games/fetch',
    tag: 'NEW',
    tagColor: '#F4A0A0',
  },
  {
    id: 'tower',
    name: 'Bark Tower',
    emoji: '🏗️',
    desc: 'Stack falling blocks. Build the tallest tower!',
    color: '#76D7C4',
    shadow: '#1ABC9C',
    bg: 'rgba(118,215,196,0.15)',
    route: '/games/tower',
    tag: 'NEW',
    tagColor: '#76D7C4',
  },
]

export default function Arena() {
  const router = useRouter()
  const { disconnect } = useDisconnect()
  const [user, setUser] = useState(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('bb_user')
    if (!saved) { router.replace('/'); return }
    try {
      const u = JSON.parse(saved)
      if (!u?.wallet || !u?.username) { router.replace('/'); return }
      setUser(u)
      setTotalPoints(parseInt(localStorage.getItem('bb_points') || '0'))
    } catch { router.replace('/') }
  }, [])

  if (!mounted || !user) return null

  return (
    <>
      <Head>
        <title>ANAGO ARENA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1E1540" />
      </Head>

      <div className="min-h-screen px-4 py-6">

        {/* ── Header ── */}
        <div className="text-center mb-6">
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: '#5B3FDB',
            border: '4px solid #2D2D2D',
            boxShadow: '4px 4px 0 #2D2D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <DogIcon size={46} color="#C17A2A" />
          </div>

          <h1 className="font-arcade" style={{
            fontSize: 'clamp(14px, 5vw, 26px)',
            color: '#F5EFE0',
            textShadow: '4px 4px 0 #2D2D2D, -2px -2px 0 #2D2D2D',
            letterSpacing: 2,
          }}>
            ANAGO ARENA
          </h1>
          <p className="font-arcade mt-1" style={{ fontSize: 7, color: '#C17A2A', letterSpacing: 3 }}>
            PICK YOUR GAME
          </p>
        </div>

        {/* ── User strip ── */}
        <div className="cartoon-card w-full mb-6" style={{ maxWidth: 480, margin: '0 auto 20px', padding: '10px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PawIcon size={14} color="#C17A2A" />
              <span className="font-arcade" style={{ fontSize: 10, color: '#C17A2A' }}>{user.username}</span>
              <span className="font-arcade" style={{ fontSize: 7, color: '#F4A0A0' }}>{shortenAddress(user.wallet)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="font-arcade" style={{ fontSize: 9, color: '#F0B429' }}>{totalPoints.toLocaleString()} pts</span>
              <button
                onClick={() => router.push('/leaderboard')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <TrophyIcon size={20} color="#F0B429" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Game grid ── */}
        <div style={{
          maxWidth: 520,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}>
          {GAMES.map(game => (
            <GameCard key={game.id} game={game} onClick={() => router.push(game.route)} />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            onClick={() => { disconnect(); localStorage.removeItem('bb_user'); router.push('/') }}
            className="font-arcade"
            style={{ fontSize: 7, color: 'rgba(244,160,160,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </>
  )
}

function GameCard({ game, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? game.bg : 'rgba(42,30,110,0.7)',
        border: `4px solid ${hover ? game.color : '#2D2D2D'}`,
        borderRadius: 16,
        boxShadow: hover
          ? `5px 5px 0 ${game.shadow}`
          : '4px 4px 0 #2D2D2D',
        padding: '18px 14px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.12s',
        transform: hover ? 'translateY(-2px)' : 'none',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Tag */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        background: game.tagColor,
        color: '#1A1008',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 6,
        padding: '2px 6px',
        borderRadius: 4,
        border: '2px solid #2D2D2D',
      }}>
        {game.tag}
      </div>

      {/* Emoji */}
      <div style={{ fontSize: 36, marginBottom: 8, lineHeight: 1 }}>{game.emoji}</div>

      {/* Name */}
      <p className="font-arcade" style={{
        fontSize: 10, color: '#F5EFE0',
        textShadow: '1px 1px 0 #2D2D2D',
        marginBottom: 6,
      }}>
        {game.name}
      </p>

      {/* Desc */}
      <p style={{
        fontFamily: 'sans-serif',
        fontSize: 11, color: 'rgba(245,239,224,0.65)',
        lineHeight: 1.5,
      }}>
        {game.desc}
      </p>

      {/* Play button */}
      <div style={{
        marginTop: 12,
        background: game.color,
        border: '2px solid #2D2D2D',
        boxShadow: `2px 2px 0 ${game.shadow}`,
        borderRadius: 8,
        padding: '6px 0',
        textAlign: 'center',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 8,
        color: '#F5EFE0',
      }}>
        PLAY →
      </div>
    </button>
  )
}
